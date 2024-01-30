package client

import (
	"encoding/json"
	"log"

	"jsimmons/poker/server"
	"jsimmons/poker/ui"

	"github.com/gorilla/websocket"
)

func Init(username string, serverAddr string) {
	connection := connect(serverAddr)
	ui.PokerClientMainView(username, serverAddr, connection)

	defer connection.Close()

	// register user
	sendMessage(server.Join, username, connection)

}

func connect(serverAddr string) *websocket.Conn {
	log.SetFlags(0)
	log.Printf("connecting to %s", serverAddr)

	c, _, err := websocket.DefaultDialer.Dial(serverAddr, nil)
	if err != nil {
		log.Fatal("dial:", err)
	}
	return c
}

func ResetBoard(conn *websocket.Conn) {
	sendMessage(server.Reset, "", conn)
}

func sendMessage(messageType server.MessageType, payload string, c *websocket.Conn) {
	message := server.Message{
		Type:    messageType,
		Payload: payload,
	}

	byteMessage, err := json.Marshal(message)

	if err != nil {
		log.Fatal("write:", err)
		return
	}

	err = c.WriteMessage(websocket.TextMessage, byteMessage)
	if err != nil {
		log.Fatal("write:", err)
		return
	}
}
