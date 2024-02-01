package server

import (
	"jsimmons/poker/messaging"
	"jsimmons/poker/types"
	"log"
	"math"
	"net/http"
	"strconv"
	"sync"

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

// mutex is used to synchronize access to the clients map.
var mutex = &sync.Mutex{}

// upgrader is used to upgrade HTTP connections to WebSocket connections.
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Adjust the origin policy to suit your needs
	},
}

func Start(port string) {
	strPort := ":" + port
	http.HandleFunc("/", handler)
	log.Println("Starting server on port ", strPort)
	log.Fatal(http.ListenAndServe(strPort, nil))
}

// handler handles incoming WebSocket connections.
func handler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error upgrading to WebSocket:", err)
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
			currentIssue = messageObject.Payload
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
			message := types.Message{
				Type:    types.CurrentEstimate,
				Payload: pointAvgStr,
			}
			byteMessage := messaging.MarshallMessage(message)
			broadcast(byteMessage, client)
		case types.Reset:
			handleReset(client)
			currentIssue = ""

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

func getPointAverage() int64 {
	possibleEstimates := []int64{1, 2, 3, 5, 8, 13}

	var total int64
	for client := range clients {
		total += client.CurrentEstimate
	}
	log.Println("Estimate average request")

	rawAvg := total / int64(len(clients))
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
