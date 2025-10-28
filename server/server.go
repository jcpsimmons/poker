package server

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"

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
var hasHost = false

// Linear integration state
var linearClient *linear.LinearClient
var linearIssues []types.LinearIssue
var currentIssueIndex int = -1
var currentLinearIssue *types.LinearIssue
var pendingQueueIndex int = -1
var confirmedIssues = make(map[string]bool)

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

	// Serve static files from web/dist
	fs := http.FileServer(http.Dir("./web/dist"))
	http.Handle("/", fs)

	// WebSocket endpoint
	http.HandleFunc("/ws", handler)

	log.Println("Starting server on port", strPort)
	log.Println("Serving web app on http://localhost" + strPort)
	log.Println("WebSocket endpoint: ws://localhost" + strPort + "/ws")
	log.Fatal(http.ListenAndServe(strPort, nil))
}

// SetLinearIssues initializes Linear integration with issues and client
func SetLinearIssues(issues []types.LinearIssue, client *linear.LinearClient) {
	linearIssues = issues
	linearClient = client
	currentIssueIndex = -1
	pendingQueueIndex = 0 // First issue ready to be suggested
	log.Printf("Linear integration enabled with %d issues", len(issues))
}

// handler handles incoming WebSocket connections.
func handler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		w.Write([]byte("Server running. Must connect via WS."))
		return
	}
	client := &Client{Conn: conn}

	clients[client] = true

	go handleMessages(client)
}

// handleMessages reads messages from the client and broadcasts them to other clients.
func handleMessages(client *Client) {

	defer func() {
		delete(clients, client)
		client.Conn.Close()
	}()

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			delete(clients, client)
			broadcastParticipCount(client)
			client.Conn.Close()
			log.Println("Error reading message:", err)
			break
		}
		log.Println("raw message received: ", string(message))
		messageObject := messaging.UnmarshallMessage(message)
		switch messageObject.Type {
		case types.Join:
			// Try to parse as new format first (with isHost), fallback to old format
			var username string
			var isHost bool

			var joinMsg types.JoinMessage
			if err := json.Unmarshal(message, &joinMsg); err == nil && joinMsg.Payload.Username != "" {
				// New format with isHost
				username = joinMsg.Payload.Username
				isHost = joinMsg.Payload.IsHost
			} else {
				// Old format (just username string)
				if messageObject.Payload == "" {
					log.Println("Error joining: no username specified")
					break
				}
				username = messageObject.Payload
				isHost = false
			}

			handleJoin(username, client, isHost)
			// send cur issue
			curIssueMessage := types.Message{
				Type:    types.CurrentIssue,
				Payload: currentIssue,
			}
			sendClientMessage(client, curIssueMessage)

			pointAvgStr := strconv.FormatInt(int64(getPointAverage()), 10)
			estimateMessage := types.Message{
				Type:    types.CurrentEstimate,
				Payload: pointAvgStr,
			}
			sendClientMessage(client, estimateMessage)

			broadcastParticipCount(client)
			broadcastVoteStatus(client)
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

		case types.Leave:
			broadcastParticipCount(client)
		default:
			log.Println("Unknown message type:", messageObject.Type)
		}
	}
}

func handleJoin(username string, sender *Client, isHost bool) {
	sender.UserID = username
	sender.CurrentEstimate = 0
	sender.IsHost = isHost

	log.Println("User joined: ", username)

	// If host joins and there's a pending issue, send suggestion
	if isHost && linearClient != nil && pendingQueueIndex >= 0 && pendingQueueIndex < len(linearIssues) {
		suggestIssueToHost(sender)
	}
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
		log.Fatal("Error writing message:", err)
	}
}

// broadcast sends a message to all clients except the sender.
func broadcast(message []byte, sender *Client) {
	mutex.Lock()
	log.Println("Broadcasting message: ", string(message))

	for client := range clients {
		log.Println("broadcast to client: ", client.UserID)
		if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Fatal("Error writing message:", err)
			break
		}
	}
	mutex.Unlock()
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
	// Check if already confirmed (idempotency)
	if confirmedIssues[payload.RequestID] {
		log.Printf("Issue confirm %s already processed (idempotent)", payload.RequestID)
		return
	}

	// Validate queue index
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

	// Mark as confirmed
	confirmedIssues[payload.RequestID] = true

	var issueTitle string
	if payload.IsCustom {
		// Custom issue
		issueTitle = payload.Identifier
		currentIssue = issueTitle
		currentLinearIssue = nil
		log.Printf("Custom issue confirmed: %s", issueTitle)
	} else {
		// Linear issue - increment index and set current
		currentIssueIndex = pendingQueueIndex
		issue := linearIssues[currentIssueIndex]
		currentLinearIssue = &issue
		issueTitle = fmt.Sprintf("%s: %s", issue.Identifier, issue.Title)
		currentIssue = issueTitle
		log.Printf("Linear issue confirmed and loaded: %s", issue.Identifier)
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

	// Also send as CurrentIssue for backward compatibility
	currentIssueMsg := types.Message{
		Type:    types.CurrentIssue,
		Payload: issueTitle,
	}
	byteMessageCompat := messaging.MarshallMessage(currentIssueMsg)
	broadcast(byteMessageCompat, sender)

	// Clear pending index after successful confirmation
	pendingQueueIndex = -1
}
