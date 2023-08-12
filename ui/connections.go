package ui

import (
	"log"

	"github.com/jcpsimmons/poker/messaging"
	"github.com/jcpsimmons/poker/types"

	"github.com/gorilla/websocket"
	"github.com/rivo/tview"
)

func connect(serverAddr string) *websocket.Conn {
	c, _, err := websocket.DefaultDialer.Dial(serverAddr, nil)
	if err != nil {
		log.Fatal("dial:", err)
	}
	return c
}

func messageListener(app *tview.Application, conn *websocket.Conn, card *tview.Table) {

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("read:", err)
			return
		}

		messageStruct := messaging.UnmarshallMessage(message)
		switch messageStruct.Type {
		case types.ParticipantCount:
			card.SetCellSimple(1, 1, messageStruct.Payload)
		case types.CurrentIssue:
			card.SetTitle("Current Issue: " + messageStruct.Payload)
		case types.CurrentEstimate:
			card.SetCellSimple(0, 1, messageStruct.Payload)
		case types.ClearBoard:
			card.SetTitle("Current Issue: None")
			card.SetCellSimple(0, 1, "0")
		}
		app.Draw()
	}
}
