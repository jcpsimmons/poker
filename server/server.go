package server

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/jcpsimmons/poker/linear"
	"github.com/jcpsimmons/poker/messaging"
	"github.com/jcpsimmons/poker/types"

	"github.com/gorilla/websocket"
)

type Client struct {
	Conn            *websocket.Conn
	UserID          string
	CurrentEstimate int64
	IsHost          bool
}

// clients stores all active client connections.
var clients = make(map[*Client]bool)
var currentIssue string = ""

// Linear integration state
var linearClient *linear.LinearClient
var linearIssues []types.LinearIssue
var currentIssueIndex int = -1
var currentLinearIssue *types.LinearIssue
var pendingQueueIndex int = -1
var confirmedIssues = make(map[string]bool)

// Queue state
var queueItems []types.QueueItem
var currentQueueIndex int = -1 // Track which queue item is currently being voted on (not used yet, reserved for future)
var queueItemCounter int = 0   // For generating unique IDs for custom items

// Track if we just assigned an estimate (for auto-advance notification)
var justAssignedEstimate bool = false

// mutex is used to synchronize access to the clients map.
var mutex = &sync.Mutex{}

// upgrader is used to upgrade HTTP connections to WebSocket connections.
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func Start(port string) {
	strPort := ":" + port

	// Register HTTP handlers on the default mux
	RegisterHandlers()

	log.Println("Starting server on port", strPort)
	log.Println("Serving web app on http://localhost" + strPort)
	log.Println("WebSocket endpoint: ws://localhost" + strPort + "/ws")
	log.Fatal(http.ListenAndServe(strPort, nil))
}

// RegisterHandlers sets up the static file server and WebSocket endpoint
// on the default HTTP serve mux. This allows serving either on a local
// TCP listener or any custom net.Listener (e.g., ngrok) using http.Serve.
func RegisterHandlers() {
	// Serve static files from web/dist
	fs := http.FileServer(http.Dir("./web/dist"))
	http.Handle("/", fs)

	// WebSocket endpoint
	http.HandleFunc("/ws", handler)
}

// SetLinearIssues initializes Linear integration with issues and client
func SetLinearIssues(issues []types.LinearIssue, client *linear.LinearClient) {
	linearIssues = issues
	linearClient = client
	currentIssueIndex = -1
	pendingQueueIndex = 0 // First issue ready to be suggested

	// Initialize queue from Linear issues
	queueItems = make([]types.QueueItem, 0, len(issues))
	for i, issue := range issues {
		queueItems = append(queueItems, types.QueueItem{
			ID:          issue.ID,
			Source:      "linear",
			Identifier:  issue.Identifier,
			Title:       issue.Title,
			Description: issue.Description,
			URL:         issue.URL,
			LinearID:    issue.ID,
			Index:       i,
		})
	}
	currentQueueIndex = -1
	queueItemCounter = 0

	log.Printf("Linear integration enabled with %d issues", len(issues))
	log.Printf("Queue initialized with %d items", len(queueItems))

	// Broadcast queue to all connected clients
	mutex.Lock()
	if len(clients) > 0 {
		broadcastQueueSyncUnlocked()
	}
	mutex.Unlock()
}

// handler handles incoming WebSocket connections.
func handler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		w.Write([]byte("Server running. Must connect via WS."))
		return
	}
	client := &Client{Conn: conn}

	mutex.Lock()
	clients[client] = true
	mutex.Unlock()

	go handleMessages(client)
}

// handleMessages reads messages from the client and broadcasts them to other clients.
func handleMessages(client *Client) {
	// Ensure client is removed on disconnect
	defer func() {
		log.Printf("[DEFER] handleMessages defer running for client %p (UserID: %s)", client, client.UserID)
		mutex.Lock()
		_, wasConnected := clients[client]
		log.Printf("[DEFER] Client %p wasConnected: %v", client, wasConnected)
		if wasConnected {
			delete(clients, client)
			log.Printf("[DEFER] Client disconnected (defer): %s", client.UserID)
		}
		mutex.Unlock()
		client.Conn.Close()
		// Only broadcast if we actually removed a connected client
		if wasConnected {
			log.Printf("[DEFER] Broadcasting participant count update (client %s was connected)", client.UserID)
			broadcastParticipCount(client)
		} else {
			log.Printf("[DEFER] Skipping broadcast - client %p was not in clients map", client)
		}
	}()

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			log.Println("Error reading message:", err)
			break
		}
		log.Println("raw message received: ", string(message))
		messageObject := messaging.UnmarshallMessage(message)
		switch messageObject.Type {
		case types.Join:
			log.Printf("[JOIN] Processing join request from client %p (UserID: %s)", client, client.UserID)
			// Try to parse as new format first (with isHost), fallback to old format
			var username string
			var isHost bool

			var joinMsg types.JoinMessage
			if err := json.Unmarshal(message, &joinMsg); err == nil && joinMsg.Payload.Username != "" {
				// New format with isHost
				username = joinMsg.Payload.Username
				isHost = joinMsg.Payload.IsHost
				log.Printf("[JOIN] Parsed join message - username: %s, isHost: %v", username, isHost)
			} else {
				// Old format (just username string)
				if messageObject.Payload == "" {
					log.Println("[JOIN] Error joining: no username specified")
					break
				}
				username = messageObject.Payload
				isHost = false
				log.Printf("[JOIN] Parsed old format join - username: %s", username)
			}

			// Only proceed if join was successful
			log.Printf("[JOIN] Calling handleJoin for username: %s, isHost: %v", username, isHost)
			joinSuccess := handleJoin(username, client, isHost)
			log.Printf("[JOIN] handleJoin returned: %v", joinSuccess)

			if !joinSuccess {
				// Join failed (validation error or duplicate username)
				log.Printf("[JOIN] Join failed, returning from handleMessages goroutine. Client: %p", client)
				// Client has been notified and connection closed
				// Return immediately to exit the goroutine and prevent defer cleanup from running
				return
			}

			// Double-check client is still in map and connection is valid before proceeding
			mutex.Lock()
			_, stillConnected := clients[client]
			mutex.Unlock()
			if !stillConnected {
				log.Printf("[JOIN] WARNING: Client %s not in clients map after successful join! Returning immediately.", username)
				return
			}

			log.Printf("[JOIN] Join successful, proceeding with post-join setup for %s", username)

			// send cur issue (with linearIssue if applicable)
			log.Printf("[JOIN] Sending current issue to %s", username)
			var currentIssuePayload types.CurrentIssuePayload
			currentIssuePayload.Text = currentIssue
			if currentLinearIssue != nil {
				currentIssuePayload.LinearIssue = currentLinearIssue
			}

			currentIssuePayloadJSON, err := json.Marshal(currentIssuePayload)
			if err == nil {
				curIssueMessage := types.Message{
					Type:    types.CurrentIssue,
					Payload: string(currentIssuePayloadJSON),
				}
				sendClientMessage(client, curIssueMessage)
			} else {
				// Fallback to simple string
				curIssueMessage := types.Message{
					Type:    types.CurrentIssue,
					Payload: currentIssue,
				}
				sendClientMessage(client, curIssueMessage)
			}

			log.Printf("[JOIN] Calculating point average for %s", username)
			pointAvgStr := strconv.FormatInt(int64(getPointAverage()), 10)
			log.Printf("[JOIN] Point average calculated: %s", pointAvgStr)
			estimateMessage := types.Message{
				Type:    types.CurrentEstimate,
				Payload: pointAvgStr,
			}
			sendClientMessage(client, estimateMessage)
			log.Printf("[JOIN] Sent estimate message to %s", username)

			log.Printf("[JOIN] Broadcasting participant count")
			broadcastParticipCount(client)
			log.Printf("[JOIN] Broadcasting vote status")
			broadcastVoteStatus(client)
			// Send queue sync to newly joined client
			log.Printf("[JOIN] Broadcasting queue sync")
			broadcastQueueSync()
			log.Printf("[JOIN] Complete - all post-join messages sent to %s", username)
		case types.NewIssue:
			// If we have Linear issues queued, use next from queue
			if linearClient != nil && currentIssueIndex >= 0 && currentIssueIndex < len(linearIssues) {
				issue := linearIssues[currentIssueIndex]
				currentLinearIssue = &issue
				currentIssue = fmt.Sprintf("%s: %s", issue.Identifier, issue.Title)
				log.Printf("Loaded Linear issue: %s", currentIssue)
			} else {
				// Manual issue entry
				currentIssue = messageObject.Payload
				currentLinearIssue = nil
			}
			message := types.Message{
				Type:    types.CurrentIssue,
				Payload: currentIssue,
			}
			byteMessage := messaging.MarshallMessage(message)
			broadcast(byteMessage, client)
		case types.Estimate:
			numEstimate, err := strconv.ParseInt(messageObject.Payload, 10, 32)
			if err != nil {
				log.Println("Error parsing estimate:", err)
				break
			}
			client.CurrentEstimate = numEstimate
			broadcastVoteStatus(client)
		case types.Reveal:
			pointAvg := getPointAverage()
			pointAvgStr := strconv.FormatInt(pointAvg, 10)
			message := types.RevealMessage{
				Type: types.RevealData,
				Payload: types.RevealPayload{
					PointAvg:  pointAvgStr,
					Estimates: getFormattedRevealData(),
				},
			}
			byteMessage := messaging.MarshallMessage(message)
			broadcast(byteMessage, client)
		case types.Reset:
			// Push voting results to Linear if applicable
			if currentLinearIssue != nil && linearClient != nil {
				pushVotingResultsToLinear(client)
			}
			handleReset(client)
			currentIssue = ""
			currentLinearIssue = nil

			// Prepare next Linear issue suggestion (don't increment index yet)
			if linearClient != nil && len(linearIssues) > 0 {
				nextIndex := currentIssueIndex + 1
				if nextIndex < len(linearIssues) {
					pendingQueueIndex = nextIndex
					log.Printf("Next Linear issue available: %s", linearIssues[nextIndex].Identifier)
					// Send suggestion to all hosts
					suggestIssueToHosts()
				} else {
					log.Println("All Linear issues have been estimated")
					pendingQueueIndex = -1
					// Send "no more issues" message to hosts
					suggestNoMoreIssuesToHosts()
				}
			}

		case types.MessageIssueConfirm:
			var confirmMsg types.IssueConfirmMessage
			if err := json.Unmarshal(message, &confirmMsg); err != nil {
				log.Println("Error parsing issue confirm:", err)
				break
			}
			handleIssueConfirm(confirmMsg.Payload, client)

		case types.MessageQueueAdd:
			var addMsg types.QueueAddMessage
			if err := json.Unmarshal(message, &addMsg); err != nil {
				log.Println("Error parsing queue add:", err)
				break
			}
			handleQueueAdd(addMsg.Payload, client)

		case types.MessageQueueUpdate:
			var updateMsg types.QueueUpdateMessage
			if err := json.Unmarshal(message, &updateMsg); err != nil {
				log.Println("Error parsing queue update:", err)
				break
			}
			handleQueueUpdate(updateMsg.Payload, client)

		case types.MessageQueueDelete:
			var deleteMsg types.QueueDeleteMessage
			if err := json.Unmarshal(message, &deleteMsg); err != nil {
				log.Println("Error parsing queue delete:", err)
				break
			}
			handleQueueDelete(deleteMsg.Payload, client)

		case types.MessageQueueReorder:
			var reorderMsg types.QueueReorderMessage
			if err := json.Unmarshal(message, &reorderMsg); err != nil {
				log.Println("Error parsing queue reorder:", err)
				break
			}
			handleQueueReorder(reorderMsg.Payload, client)

		case types.MessageAssignEstimate:
			handleAssignEstimate(client)

		case types.Leave:
			broadcastParticipCount(client)
		default:
			log.Println("Unknown message type:", messageObject.Type)
		}
	}
}

// validateUsername checks if a username meets requirements
func validateUsername(username string) (string, error) {
	// Trim whitespace
	trimmed := strings.TrimSpace(username)

	// Check if empty
	if trimmed == "" {
		return "", fmt.Errorf("username is required")
	}

	// Check minimum length
	length := utf8.RuneCountInString(trimmed)
	if length < 2 {
		return "", fmt.Errorf("username must be at least 2 characters")
	}

	// Check maximum length
	if length > 20 {
		return "", fmt.Errorf("username must be 20 characters or less")
	}

	// Check for valid characters (alphanumeric, hyphens, underscores, spaces)
	validPattern := regexp.MustCompile(`^[a-zA-Z0-9 _-]+$`)
	if !validPattern.MatchString(trimmed) {
		return "", fmt.Errorf("username can only contain letters, numbers, spaces, hyphens, and underscores")
	}

	// Check if username is only whitespace
	if strings.TrimSpace(strings.ReplaceAll(trimmed, " ", "")) == "" {
		return "", fmt.Errorf("username cannot be only spaces")
	}

	return trimmed, nil
}

// isUsernameTaken checks if a username is already in use (case-insensitive)
func isUsernameTaken(username string) bool {
	mutex.Lock()
	defer mutex.Unlock()

	for client := range clients {
		if client.UserID != "" && strings.EqualFold(client.UserID, username) {
			return true
		}
	}
	return false
}

// hasHost checks if there's already a host in the session
func hasHost() bool {
	mutex.Lock()
	defer mutex.Unlock()

	for client := range clients {
		if client.IsHost {
			return true
		}
	}
	return false
}

func handleJoin(username string, sender *Client, isHost bool) bool {
	log.Printf("[handleJoin] START - username: %s, isHost: %v, client: %p, current UserID: %s", username, isHost, sender, sender.UserID)

	// Validate username
	validUsername, err := validateUsername(username)
	if err != nil {
		log.Printf("[handleJoin] VALIDATION FAILED - username: %s - %v", username, err)
		// Send error message to client
		errorMsg := types.Message{
			Type:    types.JoinError,
			Payload: err.Error(),
		}
		byteMessage := messaging.MarshallMessage(errorMsg)
		if writeErr := sender.Conn.WriteMessage(websocket.TextMessage, byteMessage); writeErr != nil {
			log.Printf("[handleJoin] Error writing validation error: %v", writeErr)
		}
		// Close connection
		sender.Conn.Close()
		log.Printf("[handleJoin] Closed connection after validation failure")
		// Remove from clients map with mutex protection
		mutex.Lock()
		_, existed := clients[sender]
		delete(clients, sender)
		mutex.Unlock()
		log.Printf("[handleJoin] Removed from clients map (existed: %v), returning false", existed)
		return false
	}

	// Check for duplicate username (case-insensitive)
	if isUsernameTaken(validUsername) {
		log.Printf("[handleJoin] DUPLICATE USERNAME - username: %s", validUsername)
		errorMsg := types.Message{
			Type:    types.JoinError,
			Payload: "username is already taken, please choose another",
		}
		byteMessage := messaging.MarshallMessage(errorMsg)
		if writeErr := sender.Conn.WriteMessage(websocket.TextMessage, byteMessage); writeErr != nil {
			log.Printf("[handleJoin] Error writing duplicate error: %v", writeErr)
		}
		// Close connection
		sender.Conn.Close()
		log.Printf("[handleJoin] Closed connection after duplicate username")
		// Remove from clients map with mutex protection
		mutex.Lock()
		_, existed := clients[sender]
		delete(clients, sender)
		mutex.Unlock()
		log.Printf("[handleJoin] Removed from clients map (existed: %v), returning false", existed)
		return false
	}

	// Check if trying to join as host when there's already a host
	if isHost && hasHost() {
		log.Printf("[handleJoin] MULTIPLE HOST - username: %s tried to join as host", validUsername)
		errorMsg := types.Message{
			Type:    types.JoinError,
			Payload: "a host is already in this session, please join as a player",
		}
		byteMessage := messaging.MarshallMessage(errorMsg)
		if writeErr := sender.Conn.WriteMessage(websocket.TextMessage, byteMessage); writeErr != nil {
			log.Printf("[handleJoin] Error writing multiple host error: %v", writeErr)
		}
		// Close connection
		sender.Conn.Close()
		log.Printf("[handleJoin] Closed connection after multiple host")
		// Remove from clients map with mutex protection
		mutex.Lock()
		_, existed := clients[sender]
		delete(clients, sender)
		mutex.Unlock()
		log.Printf("[handleJoin] Removed from clients map (existed: %v), returning false", existed)
		return false
	}

	sender.UserID = validUsername
	sender.CurrentEstimate = 0
	sender.IsHost = isHost

	log.Println("User joined: ", validUsername)

	// Auto-load first issue if in Linear mode, host joins, no current issue, and queue has Linear items
	if isHost && linearClient != nil && currentIssue == "" && len(queueItems) > 0 {
		// Check if first item is a Linear issue
		firstItem := queueItems[0]
		if firstItem.Source == "linear" && firstItem.LinearID != "" {
			// Find the Linear issue by ID
			var linearIssue *types.LinearIssue
			var issueIndex int = -1
			for i := range linearIssues {
				if linearIssues[i].ID == firstItem.LinearID {
					linearIssue = &linearIssues[i]
					issueIndex = i
					break
				}
			}

			if linearIssue != nil {
				currentLinearIssue = linearIssue
				currentIssueIndex = issueIndex
				currentIssue = fmt.Sprintf("%s: %s", linearIssue.Identifier, linearIssue.Title)
				pendingQueueIndex = -1

				// Broadcast issue loaded to all clients
				loadedMsg := types.IssueLoadedMessage{
					Type: types.MessageIssueLoaded,
					Payload: types.IssueLoadedPayload{
						Identifier: linearIssue.Identifier,
						Title:      currentIssue,
						QueueIndex: 0,
					},
				}
				byteMessage := messaging.MarshallMessage(loadedMsg)
				broadcast(byteMessage, sender)

				// Send as CurrentIssue for backward compatibility
				var currentIssuePayload types.CurrentIssuePayload
				currentIssuePayload.Text = currentIssue
				currentIssuePayload.LinearIssue = currentLinearIssue

				currentIssuePayloadJSON, err := json.Marshal(currentIssuePayload)
				if err == nil {
					currentIssueMsg := types.Message{
						Type:    types.CurrentIssue,
						Payload: string(currentIssuePayloadJSON),
					}
					byteMessageCompat := messaging.MarshallMessage(currentIssueMsg)
					broadcast(byteMessageCompat, sender)
				}

				// Remove first issue from queue
				removeQueueItem(firstItem.Identifier, false)
				broadcastQueueSync()

				log.Printf("Auto-loaded first Linear issue: %s", linearIssue.Identifier)
				return true
			}
		}
	}

	// If host joins and there's a pending issue, send suggestion
	if isHost && linearClient != nil && pendingQueueIndex >= 0 && pendingQueueIndex < len(linearIssues) {
		suggestIssueToHost(sender)
	}

	return true
}

func getFormattedRevealData() []types.UserEstimate {

	estimates := make([]types.UserEstimate, 0)

	for client := range clients {
		estimates = append(estimates, types.UserEstimate{
			User:     client.UserID,
			Estimate: strconv.FormatInt(client.CurrentEstimate, 10),
		})
	}
	return estimates
}

func getPointAverage() int64 {
	possibleEstimates := []int64{1, 2, 3, 5, 8, 13}

	var total int64
	didntEstimate := 0
	for client := range clients {
		est := client.CurrentEstimate
		total += est
		if est == 0 {
			didntEstimate++
		}
	}
	log.Println("Estimate average request")

	clientsLessAbsentia := len(clients) - didntEstimate
	if clientsLessAbsentia == 0 {
		return 0
	}
	rawAvg := total / int64(clientsLessAbsentia)
	diffs := make([]int64, 0)

	for i := range possibleEstimates {
		if possibleEstimates[i] == rawAvg {
			return possibleEstimates[i]
		}

		rawDiff := possibleEstimates[i] - rawAvg
		absDiff := int64(math.Abs(float64(rawDiff)))
		diffs = append(diffs, absDiff)
	}

	lowestNum := diffs[0]
	lowestIdx := 0
	for i := range diffs {
		if diffs[i] < lowestNum {
			lowestNum = diffs[i]
			lowestIdx = i
		}
	}

	return possibleEstimates[lowestIdx]
}

func handleReset(client *Client) {

	for client := range clients {
		client.CurrentEstimate = 0
	}

	clearMessage := types.Message{
		Type:    types.ClearBoard,
		Payload: "",
	}
	byteMessage := messaging.MarshallMessage(clearMessage)
	broadcast(byteMessage, client)

	broadcastVoteStatus(client)

	log.Println("Estimates reset.")
}

func broadcastParticipCount(client *Client) {
	numberOfParticipants := len(clients)
	log.Println("Participants: ", numberOfParticipants)
	pcMessage := types.Message{
		Type:    types.ParticipantCount,
		Payload: strconv.Itoa(numberOfParticipants),
	}
	byteMessage := messaging.MarshallMessage(pcMessage)
	broadcast(byteMessage, client)
}

func broadcastVoteStatus(client *Client) {
	voters := make([]types.VoterInfo, 0)

	for c := range clients {
		if c.UserID != "" {
			hasVoted := c.CurrentEstimate > 0
			log.Printf("Vote status for %s: estimate=%d, hasVoted=%v", c.UserID, c.CurrentEstimate, hasVoted)
			voters = append(voters, types.VoterInfo{
				Username: c.UserID,
				HasVoted: hasVoted,
			})
		}
	}

	voteStatusMsg := types.VoteStatusMessage{
		Type: types.VoteStatus,
		Payload: types.VoteStatusPayload{
			Voters: voters,
		},
	}

	byteMessage := messaging.MarshallMessage(voteStatusMsg)
	broadcast(byteMessage, client)
	log.Printf("Broadcasted vote status: %d voters, %d have voted", len(voters), countVoted(voters))
}

func countVoted(voters []types.VoterInfo) int {
	count := 0
	for _, v := range voters {
		if v.HasVoted {
			count++
		}
	}
	return count
}

func sendClientMessage(client *Client, message types.Message) {
	byteMessage := messaging.MarshallMessage(message)
	if err := client.Conn.WriteMessage(websocket.TextMessage, byteMessage); err != nil {
		log.Printf("Error writing message to client %s: %v", client.UserID, err)
		// Don't crash the server, just log the error
		// The client will be cleaned up by the read loop when it detects the broken connection
	}
}

// broadcast sends a message to all clients except the sender.
func broadcast(message []byte, sender *Client) {
	// Step 1: Copy client list while holding the lock (don't do network I/O under lock)
	mutex.Lock()
	clientList := make([]*Client, 0, len(clients))
	for client := range clients {
		clientList = append(clientList, client)
	}
	mutex.Unlock()

	log.Println("Broadcasting message: ", string(message))

	// Step 2: Send to all clients without holding the lock
	var deadClients []*Client
	for _, client := range clientList {
		log.Println("broadcast to client: ", client.UserID)
		if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("Error writing message to client %s: %v (marking for cleanup)", client.UserID, err)
			deadClients = append(deadClients, client)
		}
	}

	// Step 3: Clean up dead connections
	if len(deadClients) > 0 {
		mutex.Lock()
		for _, client := range deadClients {
			if _, exists := clients[client]; exists {
				delete(clients, client)
				client.Conn.Close()
				log.Printf("Removed dead client: %s", client.UserID)
			}
		}
		participantCount := len(clients)
		mutex.Unlock()

		// Notify remaining clients about updated participant count
		log.Printf("Cleaned up %d dead clients, %d remaining", len(deadClients), participantCount)
		go broadcastParticipCount(nil)
	}
}

// pushVotingResultsToLinear posts voting results as a comment to the Linear issue
func pushVotingResultsToLinear(sender *Client) {
	if currentLinearIssue == nil || linearClient == nil {
		return
	}

	// Get voting breakdown
	estimates := getFormattedRevealData()
	pointAvg := getPointAverage()

	// Format comment
	var comment strings.Builder
	comment.WriteString("## Planning Poker Results\n\n")

	for _, est := range estimates {
		if est.Estimate != "0" {
			comment.WriteString(fmt.Sprintf("- %s: %s\n", est.User, est.Estimate))
		}
	}

	comment.WriteString(fmt.Sprintf("\n**Average:** %d points", pointAvg))

	// Post to Linear
	err := linearClient.PostComment(currentLinearIssue.ID, comment.String())
	if err != nil {
		log.Printf("Failed to post comment to Linear issue %s: %v", currentLinearIssue.Identifier, err)
	} else {
		log.Printf("Posted voting results to Linear issue %s", currentLinearIssue.Identifier)
	}
}

// truncateDescription truncates text to maxLen characters and sets hasMore flag
func truncateDescription(text string, maxLen int) (string, bool) {
	if len(text) <= maxLen {
		return text, false
	}
	return text[:maxLen] + "...", true
}

// suggestIssueToHost sends an issue suggestion to a specific host client
func suggestIssueToHost(host *Client) {
	if pendingQueueIndex < 0 || pendingQueueIndex >= len(linearIssues) {
		return
	}

	issue := linearIssues[pendingQueueIndex]
	description, hasMore := truncateDescription(issue.Description, 3000)

	suggestion := types.IssueSuggestedMessage{
		Type: types.MessageIssueSuggested,
		Payload: types.IssueSuggestedPayload{
			Version:     1,
			Source:      "linear",
			Identifier:  issue.Identifier,
			Title:       issue.Title,
			Description: description,
			URL:         issue.URL,
			QueueIndex:  pendingQueueIndex,
			HasMore:     hasMore,
		},
	}

	byteMessage := messaging.MarshallMessage(suggestion)
	if err := host.Conn.WriteMessage(websocket.TextMessage, byteMessage); err != nil {
		log.Printf("Error sending issue suggestion to host %s: %v", host.UserID, err)
	} else {
		log.Printf("Sent issue suggestion to host: %s", host.UserID)
	}
}

// suggestIssueToHosts sends the current pending issue suggestion to all hosts
func suggestIssueToHosts() {
	mutex.Lock()
	defer mutex.Unlock()

	for client := range clients {
		if client.IsHost {
			suggestIssueToHost(client)
		}
	}
}

// suggestNoMoreIssuesToHosts informs hosts that there are no more Linear issues
func suggestNoMoreIssuesToHosts() {
	mutex.Lock()
	defer mutex.Unlock()

	suggestion := types.IssueSuggestedMessage{
		Type: types.MessageIssueSuggested,
		Payload: types.IssueSuggestedPayload{
			Version:    1,
			Source:     "system",
			Identifier: "",
			Title:      "No more Linear issues in queue",
			QueueIndex: -1,
		},
	}

	byteMessage := messaging.MarshallMessage(suggestion)

	for client := range clients {
		if client.IsHost {
			if err := client.Conn.WriteMessage(websocket.TextMessage, byteMessage); err != nil {
				log.Printf("Error sending 'no more issues' to host %s: %v", client.UserID, err)
			}
		}
	}
}

// handleIssueConfirm validates and processes an issue confirmation from the host
func handleIssueConfirm(payload types.IssueConfirmPayload, sender *Client) {
	log.Printf("📥 Received issue confirm: identifier=%s, queueIndex=%d, isCustom=%v, requestID=%s", payload.Identifier, payload.QueueIndex, payload.IsCustom, payload.RequestID)

	// Check if already confirmed (idempotency)
	if confirmedIssues[payload.RequestID] {
		log.Printf("Issue confirm %s already processed (idempotent)", payload.RequestID)
		return
	}

	var issueTitle string
	var loadedFromQueue bool = false

	// If QueueIndex is -1, try to load directly from queue
	if payload.QueueIndex == -1 {
		// Lock mutex to safely access queueItems
		mutex.Lock()
		// Find the item in the queue by identifier
		var foundIdentifier string
		for i := range queueItems {
			if queueItems[i].Identifier == payload.Identifier &&
				((payload.IsCustom && queueItems[i].Source == "custom") ||
					(!payload.IsCustom && queueItems[i].Source == "linear")) {
				foundIdentifier = payload.Identifier
				loadedFromQueue = true
				break
			}
		}
		mutex.Unlock()

		if loadedFromQueue {
			log.Printf("✅ Found issue %s in queue, loading from queue", payload.Identifier)
			// Update pendingQueueIndex to match (for Linear issues)
			if !payload.IsCustom && linearClient != nil {
				// Find the index in linearIssues
				for j := range linearIssues {
					if linearIssues[j].Identifier == foundIdentifier {
						pendingQueueIndex = j
						log.Printf("📍 Set pendingQueueIndex to %d for Linear issue", j)
						break
					}
				}
			}
		} else {
			log.Printf("❌ Issue %s not found in queue for direct loading (queue has %d items)", payload.Identifier, len(queueItems))
			// Fall back to suggesting next issue if available
			if !payload.IsCustom && linearClient != nil && pendingQueueIndex >= 0 && pendingQueueIndex < len(linearIssues) {
				suggestIssueToHost(sender)
			}
			return
		}
	} else {
		// Validate queue index for suggested issues
		if payload.QueueIndex != pendingQueueIndex {
			log.Printf("Stale queue index: expected %d, got %d", pendingQueueIndex, payload.QueueIndex)
			// Send stale message and re-suggest current issue
			staleMsg := types.Message{
				Type:    types.MessageIssueStale,
				Payload: "Queue has changed, please refresh",
			}
			byteMessage := messaging.MarshallMessage(staleMsg)
			sender.Conn.WriteMessage(websocket.TextMessage, byteMessage)
			suggestIssueToHost(sender)
			return
		}
	}

	// Mark as confirmed
	confirmedIssues[payload.RequestID] = true

	if payload.IsCustom {
		// Custom issue
		issueTitle = payload.Identifier
		currentIssue = issueTitle
		currentLinearIssue = nil
		log.Printf("Custom issue confirmed: %s", issueTitle)
	} else {
		// Linear issue - use pendingQueueIndex (set above if loaded from queue)
		if pendingQueueIndex >= 0 && pendingQueueIndex < len(linearIssues) {
			currentIssueIndex = pendingQueueIndex
			issue := linearIssues[currentIssueIndex]
			currentLinearIssue = &issue
			issueTitle = fmt.Sprintf("%s: %s", issue.Identifier, issue.Title)
			currentIssue = issueTitle
			log.Printf("Linear issue confirmed and loaded: %s", issue.Identifier)
		} else {
			log.Printf("Invalid pendingQueueIndex: %d (linearIssues length: %d)", pendingQueueIndex, len(linearIssues))
			return
		}
	}

	// If we just assigned an estimate, broadcast auto-advance notification to all clients
	if justAssignedEstimate {
		justAssignedEstimate = false // Reset flag
		autoAdvanceMsg := types.Message{
			Type:    "autoAdvance",
			Payload: "Advancing to next issue in queue...",
		}
		byteAutoAdvance := messaging.MarshallMessage(autoAdvanceMsg)
		broadcast(byteAutoAdvance, sender)
	}

	// Broadcast issue loaded to all clients
	loadedMsg := types.IssueLoadedMessage{
		Type: types.MessageIssueLoaded,
		Payload: types.IssueLoadedPayload{
			Identifier: payload.Identifier,
			Title:      issueTitle,
			QueueIndex: payload.QueueIndex,
		},
	}
	byteMessage := messaging.MarshallMessage(loadedMsg)
	broadcast(byteMessage, sender)

	// Also send as CurrentIssue for backward compatibility (with linearIssue if applicable)
	var currentIssuePayload types.CurrentIssuePayload
	currentIssuePayload.Text = issueTitle
	if currentLinearIssue != nil {
		currentIssuePayload.LinearIssue = currentLinearIssue
	}

	currentIssuePayloadJSON, err := json.Marshal(currentIssuePayload)
	if err != nil {
		log.Printf("Error marshalling current issue payload: %v", err)
		// Fallback to simple string
		currentIssueMsg := types.Message{
			Type:    types.CurrentIssue,
			Payload: issueTitle,
		}
		byteMessageCompat := messaging.MarshallMessage(currentIssueMsg)
		broadcast(byteMessageCompat, sender)
	} else {
		currentIssueMsg := types.Message{
			Type:    types.CurrentIssue,
			Payload: string(currentIssuePayloadJSON),
		}
		byteMessageCompat := messaging.MarshallMessage(currentIssueMsg)
		broadcast(byteMessageCompat, sender)
	}

	// Clear pending index after successful confirmation
	pendingQueueIndex = -1

	// Remove confirmed issue from queue
	removeQueueItem(payload.Identifier, payload.IsCustom)
	broadcastQueueSync()
}

// broadcastQueueSync sends the current queue state to all clients
func broadcastQueueSync() {
	mutex.Lock()
	defer mutex.Unlock()
	broadcastQueueSyncUnlocked()
}

// broadcastQueueSyncUnlocked sends queue sync (caller must hold mutex)
func broadcastQueueSyncUnlocked() {
	syncMsg := types.QueueSyncMessage{
		Type: types.MessageQueueSync,
		Payload: types.QueueSyncPayload{
			Items: queueItems,
		},
	}
	byteMessage := messaging.MarshallMessage(syncMsg)

	for client := range clients {
		if err := client.Conn.WriteMessage(websocket.TextMessage, byteMessage); err != nil {
			log.Printf("Error sending queue sync to client %s: %v", client.UserID, err)
		}
	}
}

// removeQueueItem removes an item from the queue by identifier or ID
func removeQueueItem(identifier string, isCustom bool) {
	mutex.Lock()
	defer mutex.Unlock()

	newQueue := make([]types.QueueItem, 0)
	for _, item := range queueItems {
		shouldRemove := false

		if isCustom {
			// For custom items, match by identifier (since ID might be different format)
			if item.Source == "custom" && item.Identifier == identifier {
				shouldRemove = true
			}
		} else {
			// For Linear items, match by LinearID
			if item.Source == "linear" && item.LinearID != "" {
				// Check if this matches the identifier
				linearIssue := findLinearIssueByIdentifier(identifier)
				if linearIssue != nil && item.LinearID == linearIssue.ID {
					shouldRemove = true
				}
			}
		}

		if shouldRemove {
			continue
		}

		// Recalculate index
		item.Index = len(newQueue)
		newQueue = append(newQueue, item)
	}

	queueItems = newQueue
	log.Printf("Removed item from queue, %d items remaining", len(queueItems))
}

// findLinearIssueByIdentifier finds a Linear issue by its identifier
func findLinearIssueByIdentifier(identifier string) *types.LinearIssue {
	for i := range linearIssues {
		if linearIssues[i].Identifier == identifier {
			return &linearIssues[i]
		}
	}
	return nil
}

// handleQueueAdd handles adding a custom item to the queue
func handleQueueAdd(payload types.QueueAddPayload, sender *Client) {
	if !sender.IsHost {
		log.Printf("Non-host attempted to add queue item")
		return
	}

	mutex.Lock()
	defer mutex.Unlock()

	queueItemCounter++
	itemID := fmt.Sprintf("custom-%d-%d", time.Now().Unix(), queueItemCounter)

	newItem := types.QueueItem{
		ID:          itemID,
		Source:      "custom",
		Identifier:  payload.Identifier,
		Title:       payload.Title,
		Description: payload.Description,
		Index:       len(queueItems),
	}

	// Insert at specified index or append to end
	if payload.Index != nil && *payload.Index >= 0 && *payload.Index < len(queueItems) {
		// Insert at position
		newQueue := make([]types.QueueItem, 0, len(queueItems)+1)
		newQueue = append(newQueue, queueItems[:*payload.Index]...)
		newItem.Index = *payload.Index
		newQueue = append(newQueue, newItem)
		for i := *payload.Index + 1; i < len(queueItems); i++ {
			item := queueItems[i]
			item.Index = i + 1
			newQueue = append(newQueue, item)
		}
		queueItems = newQueue
	} else {
		// Append to end
		queueItems = append(queueItems, newItem)
	}

	log.Printf("Host %s added queue item: %s", sender.UserID, newItem.Identifier)
	broadcastQueueSyncUnlocked()
}

// handleQueueUpdate handles updating a custom queue item
func handleQueueUpdate(payload types.QueueUpdatePayload, sender *Client) {
	if !sender.IsHost {
		log.Printf("Non-host attempted to update queue item")
		return
	}

	mutex.Lock()
	defer mutex.Unlock()

	for i := range queueItems {
		if queueItems[i].ID == payload.ID {
			if queueItems[i].Source != "custom" {
				log.Printf("Attempted to update non-custom queue item")
				return
			}

			if payload.Identifier != "" {
				queueItems[i].Identifier = payload.Identifier
			}
			if payload.Title != "" {
				queueItems[i].Title = payload.Title
			}
			if payload.Description != "" {
				queueItems[i].Description = payload.Description
			}

			log.Printf("Host %s updated queue item: %s", sender.UserID, payload.ID)
			broadcastQueueSyncUnlocked()
			return
		}
	}

	log.Printf("Queue item not found for update: %s", payload.ID)
}

// handleQueueDelete handles removing an item from the queue
func handleQueueDelete(payload types.QueueDeletePayload, sender *Client) {
	if !sender.IsHost {
		log.Printf("Non-host attempted to delete queue item")
		return
	}

	mutex.Lock()
	defer mutex.Unlock()

	newQueue := make([]types.QueueItem, 0)
	found := false
	for _, item := range queueItems {
		if item.ID == payload.ID {
			found = true
			continue
		}
		// Recalculate index
		item.Index = len(newQueue)
		newQueue = append(newQueue, item)
	}

	if found {
		queueItems = newQueue
		log.Printf("Host %s deleted queue item: %s", sender.UserID, payload.ID)
		broadcastQueueSyncUnlocked()
	} else {
		log.Printf("Queue item not found for delete: %s", payload.ID)
	}
}

// handleQueueReorder handles reordering queue items
func handleQueueReorder(payload types.QueueReorderPayload, sender *Client) {
	if !sender.IsHost {
		log.Printf("Non-host attempted to reorder queue")
		return
	}

	mutex.Lock()
	defer mutex.Unlock()

	// Create a map for quick lookup
	itemMap := make(map[string]types.QueueItem)
	for _, item := range queueItems {
		itemMap[item.ID] = item
	}

	// Build new queue in the specified order
	newQueue := make([]types.QueueItem, 0, len(payload.ItemIDs))
	for i, id := range payload.ItemIDs {
		if item, exists := itemMap[id]; exists {
			item.Index = i
			newQueue = append(newQueue, item)
		}
	}

	// Add any items not in the reorder list (shouldn't happen, but be safe)
	for _, item := range queueItems {
		found := false
		for _, id := range payload.ItemIDs {
			if item.ID == id {
				found = true
				break
			}
		}
		if !found {
			item.Index = len(newQueue)
			newQueue = append(newQueue, item)
		}
	}

	queueItems = newQueue
	log.Printf("Host %s reordered queue, %d items", sender.UserID, len(queueItems))
	broadcastQueueSyncUnlocked()
}

// handleAssignEstimate assigns the current average estimate to the Linear issue
func handleAssignEstimate(sender *Client) {
	if !sender.IsHost {
		log.Printf("Non-host attempted to assign estimate")
		return
	}

	// Only allow if there's a current Linear issue and votes have been revealed
	if currentLinearIssue == nil || linearClient == nil {
		log.Printf("No Linear issue currently active")
		return
	}

	// Calculate average estimate
	average := getPointAverage()
	if average == 0 {
		log.Printf("No valid estimates to assign")
		return
	}

	// Update estimate in Linear
	err := linearClient.UpdateEstimate(currentLinearIssue.ID, average)
	if err != nil {
		log.Printf("Failed to assign estimate to Linear issue %s: %v", currentLinearIssue.Identifier, err)
		// Send error message to host
		errorMsg := types.Message{
			Type:    "estimateAssignmentError",
			Payload: fmt.Sprintf("Failed to assign estimate: %v", err),
		}
		byteMessage := messaging.MarshallMessage(errorMsg)
		sender.Conn.WriteMessage(websocket.TextMessage, byteMessage)
		return
	}

	log.Printf("✅ Successfully assigned estimate %d to Linear issue %s", average, currentLinearIssue.Identifier)

	// Mark that we just assigned (for auto-advance notification)
	justAssignedEstimate = true
	log.Printf("🏷️ Set justAssignedEstimate = true")

	// Send success message to host
	successMsg := types.Message{
		Type:    "estimateAssignmentSuccess",
		Payload: fmt.Sprintf("Estimate %d assigned to %s", average, currentLinearIssue.Identifier),
	}
	byteMessage := messaging.MarshallMessage(successMsg)
	log.Printf("📤 Sending estimateAssignmentSuccess message to host")
	if err := sender.Conn.WriteMessage(websocket.TextMessage, byteMessage); err != nil {
		log.Printf("❌ Error sending estimateAssignmentSuccess: %v", err)
	}
}
