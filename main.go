package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

// Client represents a WebSocket client connection.
type Client struct {
	conn        *websocket.Conn
	userId      string
	curEstimate int32
}

type MessageType int

type Message struct {
	Type    string
	Payload string
}

// clients stores all active client connections.
var clients = make(map[*Client]bool)

// mutex is used to synchronize access to the clients map.
var mutex = &sync.Mutex{}

// upgrader is used to upgrade HTTP connections to WebSocket connections.
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Adjust the origin policy to suit your needs
	},
}

func main() {
	http.HandleFunc("/", handler)
	log.Println("WebSocket server started on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// handler handles incoming WebSocket connections.
func handler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error upgrading to WebSocket:", err)
		return
	}
	client := &Client{conn: conn}

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
		client.conn.Close()
	}()

	for {
		_, message, err := client.conn.ReadMessage()
		if err != nil {
			log.Println("Error reading message:", err)
			break
		}

		// get json
		// parse json
		messageObject := Message{}
		json.Unmarshal([]byte(message), &messageObject)

		switch messageObject.Type {
		case "join":
			client.userId = messageObject.Payload
			broadcast([]byte("User "+client.userId+" joined"), client)
		case "estimate":
			client.curEstimate = messageObject.Payload
			broadcast([]byte("User "+client.userId+" estimated "+client.curEstimate), client)
		case "reveal":
			broadcast([]byte("User "+client.userId+" revealed "+client.curEstimate), client)
		case "reset":
			broadcast([]byte("User "+client.userId+" reset"), client)
		case "leave":
			broadcast([]byte("User "+client.userId+" left"), client)
		default:
			log.Println("Unknown message type:", messageObject.Type)
	}
}

func (c *Client) send(message string) {
	if err := c.conn.WriteMessage(websocket.TextMessage, []byte(message)); err != nil {
		log.Println("Error writing message:", err)
	}
}

// broadcast sends a message to all clients except the sender.
func broadcast(message []byte, sender *Client) {
	mutex.Lock()
	defer mutex.Unlock()

	for client := range clients {
		if client != sender {
			if err := client.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Println("Error writing message:", err)
				break
			}
		} 
	}
}
