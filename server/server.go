package server

import (
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
	http.HandleFunc("/", handler)
	log.Println("Starting server on port ", strPort)
	log.Fatal(http.ListenAndServe(strPort, nil))
}

// SetLinearIssues initializes Linear integration with issues and client
func SetLinearIssues(issues []types.LinearIssue, client *linear.LinearClient) {
	linearIssues = issues
	linearClient = client
	currentIssueIndex = 0
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
			if messageObject.Payload == "" {
				log.Println("Error joining: no username specified")
				break
			}
			handleJoin(messageObject.Payload, client)
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

			// Move to next Linear issue if available
			if linearClient != nil && len(linearIssues) > 0 {
				currentIssueIndex++
				if currentIssueIndex < len(linearIssues) {
					log.Printf("Next Linear issue available: %s", linearIssues[currentIssueIndex].Identifier)
				} else {
					log.Println("All Linear issues have been estimated")
				}
			}

		case types.Leave:
			broadcastParticipCount(client)
		default:
			log.Println("Unknown message type:", messageObject.Type)
		}
	}
}

func handleJoin(username string, sender *Client) {
	sender.UserID = username
	sender.CurrentEstimate = 0

	log.Println("User joined: ", username)
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
