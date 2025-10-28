package messaging

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"strconv"

	"github.com/jcpsimmons/poker/types"

	"github.com/gorilla/websocket"
)

// Connect establishes a websocket connection to the server
func Connect(serverAddr string) (*websocket.Conn, error) {
	c, _, err := websocket.DefaultDialer.Dial(serverAddr, nil)
	if err != nil {
		return nil, err
	}
	return c, nil
}

// ClearBoard sends a message to clear the board
func ClearBoard(conn *websocket.Conn) {
	sendMessage(types.Reset, "", conn)
}

func ResetBoard(conn *websocket.Conn) {
	sendMessage(types.Reset, "", conn)
}

func JoinSession(conn *websocket.Conn, username string, isHost bool) {
	joinMsg := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: username,
			IsHost:   isHost,
		},
	}

	byteMessage, err := json.Marshal(joinMsg)
	if err != nil {
		log.Fatal("Error marshalling join message:", err)
		return
	}

	err = conn.WriteMessage(websocket.TextMessage, byteMessage)
	if err != nil {
		log.Fatal("Error sending join message:", err)
		return
	}
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

func UnmarshallRevealMessage(message []byte) types.RevealMessage {
	var messageObject types.RevealMessage
	json.Unmarshal([]byte(message), &messageObject)
	return messageObject
}

func MarshallMessage(message interface{}) []byte {
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

// GenerateRequestID generates a unique request ID for idempotency
func GenerateRequestID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		log.Printf("Error generating request ID: %v", err)
		return ""
	}
	return hex.EncodeToString(bytes)
}

// SendIssueConfirm sends an issue confirmation to the server
func SendIssueConfirm(conn *websocket.Conn, identifier string, queueIndex int, isCustom bool) {
	confirmMsg := types.IssueConfirmMessage{
		Type: types.MessageIssueConfirm,
		Payload: types.IssueConfirmPayload{
			RequestID:  GenerateRequestID(),
			Identifier: identifier,
			QueueIndex: queueIndex,
			IsCustom:   isCustom,
		},
	}

	byteMessage, err := json.Marshal(confirmMsg)
	if err != nil {
		log.Fatal("Error marshalling issue confirm:", err)
		return
	}

	err = conn.WriteMessage(websocket.TextMessage, byteMessage)
	if err != nil {
		log.Fatal("Error sending issue confirm:", err)
		return
	}
}
