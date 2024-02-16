package ui

import (
	"encoding/json"
	"fmt"
	"log"

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

func messageListener(app *tview.Application, conn *websocket.Conn, card *tview.Table, votes *tview.Flex) {

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("read:", err)
			return
		}

		var m map[string]json.RawMessage
		if err = json.Unmarshal(message, &m); err != nil {
			panic(err)
		}

		var messageType types.MessageType
		if err := json.Unmarshal(m["type"], &messageType); err != nil {
			panic(err)
		}

		if messageType == types.RevealData {
			var messageStruct types.RevealMessage
			if err := json.Unmarshal(message, &messageStruct); err != nil {
				panic(err)
			}
			fmt.Println(messageStruct.Payload)
			// ui changes
			votes.Clear()
			for _, estimateData := range messageStruct.Payload.Estimates {
				user := estimateData.User
				score := estimateData.Estimate
				entry := generateVoteText(score, user)
				votes.AddItem(entry, 0, 1, true)
			}

		} else {
			var messageStruct types.Message
			if err := json.Unmarshal(message, &messageStruct); err != nil {
				panic(err)
			}

			switch messageType {
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
		}

		app.Draw()
	}
}
