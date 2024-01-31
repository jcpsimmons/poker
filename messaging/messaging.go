package messaging

import (
	"encoding/json"
	"log"

	"strconv"

	"jsimmons/poker/server"

	"github.com/gorilla/websocket"
)

func ResetBoard(conn *websocket.Conn) {
	sendMessage(server.Reset, "", conn)
}

func JoinSession(conn *websocket.Conn, username string) {
	sendMessage(server.Join, username, conn)
}

func LeaveSession(conn *websocket.Conn) {
	sendMessage(server.Leave, "", conn)
}

func RevealRound(conn *websocket.Conn) {
	sendMessage(server.Reveal, "", conn)
}

func NewIssue(conn *websocket.Conn, issue string) {
	sendMessage(server.NewIssue, issue, conn)
}

func Estimate(conn *websocket.Conn, estimate int32) {
	sendMessage(server.Estimate, strconv.Itoa(int(estimate)), conn)
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
