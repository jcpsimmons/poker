package server

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"

	"github.com/gorilla/websocket"
)

// bascially just nest this sumbitch in a subcommand and write the client code here.

// Client represents a WebSocket client connection.
type Client struct {
	Conn            *websocket.Conn
	UserID          string
	CurrentEstimate int32
}

type MessageType string

const (
	Join     MessageType = "join"
	Estimate MessageType = "estimate"
	Leave    MessageType = "leave"
	Reveal   MessageType = "reveal"
	Reset    MessageType = "reset"
	NewIssue MessageType = "newIssue"
)

type Message struct {
	Type    MessageType `json:"type"`
	Payload string      `json:"payload"`
}

// clients stores all active client connections.
var clients = make(map[*Client]bool)
var currentIssue string = ""

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

	mutex.Lock()
	clients[client] = true
	mutex.Unlock()

	go handleMessages(client)
}

// handleMessages reads messages from the client and broadcasts them to other clients.
func handleMessages(client *Client) {
	defer func() {
		mutex.Lock()
		delete(clients, client)
		mutex.Unlock()
		client.Conn.Close()
	}()

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			log.Println("Error reading message:", err)
			break
		}

		log.Println("raw message received: ", string(message))
		messageObject := Message{}
		json.Unmarshal([]byte(message), &messageObject)

		switch messageObject.Type {
		case Join:
			if messageObject.Payload == "" {
				log.Println("Error joining: no username specified")
				break
			}
			handleJoin(messageObject.Payload, client)
			broadcast([]byte("User "+client.UserID+" joined"), client)
		case NewIssue:
			broadcast([]byte("New issue: "+messageObject.Payload), client)
		case Estimate:
			numEstimate, err := strconv.ParseInt(messageObject.Payload, 10, 32)
			if err != nil {
				log.Println("Error parsing estimate:", err)
				break
			}
			client.CurrentEstimate = int32(numEstimate)
			broadcast([]byte("User "+client.UserID+" estimated "+messageObject.Payload), client)
		case Reveal:
			pointAvg := getPointAverage()
			pointAvgStr := strconv.FormatInt(int64(pointAvg), 10)
			broadcast([]byte("User "+client.UserID+" revealed the cards. The estimate is "+pointAvgStr), client)
		case Reset:
			removeAllEstimates()
			broadcast([]byte("User "+client.UserID+" started the next round."), client)
		case Leave:
			broadcast([]byte("User "+client.UserID+" left."), client)
		default:
			log.Println("Unknown message type:", messageObject.Type)
		}
	}
}

func handleJoin(username string, sender *Client) {
	mutex.Lock()
	defer mutex.Unlock()
	sender.UserID = username
	sender.CurrentEstimate = 0
	log.Println("User joined: ", username)
}

func getPointAverage() int32 {
	mutex.Lock()
	defer mutex.Unlock()
	var total int32
	for client := range clients {
		total += client.CurrentEstimate
	}
	log.Println("Estimate average request")
	return total / int32(len(clients))
}

func removeAllEstimates() {
	mutex.Lock()
	defer mutex.Unlock()
	for client := range clients {
		client.CurrentEstimate = 0
	}

	log.Println("Estimates reset.")
}

// broadcast sends a message to all clients except the sender.
func broadcast(message []byte, sender *Client) {
	log.Println("Broadcasting message: ", string(message))
	mutex.Lock()
	defer mutex.Unlock()
	for client := range clients {
		if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Println("Error writing message:", err)
			break
		}
	}
}
