package messaging

import (
	"encoding/json"
	"log"

	"strconv"

	"github.com/jcpsimmons/poker/types"

	"github.com/gorilla/websocket"
)

func ResetBoard(conn *websocket.Conn) {
	sendMessage(types.Reset, "", conn)
}

func JoinSession(conn *websocket.Conn, username string) {
	sendMessage(types.Join, username, conn)
}

func LeaveSession(conn *websocket.Conn) {
	sendMessage(types.Leave, "", conn)
}

func RevealRound(conn *websocket.Conn) {
	sendMessage(types.Reveal, "", conn)
}

func NewIssue(conn *websocket.Conn, issue string) {
	sendMessage(types.NewIssue, issue, conn)
}

func Estimate(conn *websocket.Conn, estimate int64) {
	sendMessage(types.Estimate, strconv.Itoa(int(estimate)), conn)
}

func UnmarshallMessage(message []byte) types.Message {
	var messageObject types.Message
	json.Unmarshal([]byte(message), &messageObject)
	return messageObject
}

func MarshallMessage(message types.Message) []byte {
	byteMessage, err := json.Marshal(message)
	if err != nil {
		log.Fatal("write:", err)
		return nil
	}
	return byteMessage
}

func sendMessage(messageType types.MessageType, payload string, c *websocket.Conn) {
	message := types.Message{
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
