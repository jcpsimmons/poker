package ui

import (
	"encoding/json"
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

		switch messageType {
		case types.RevealData:
			var messageStruct types.RevealMessage
			if err := json.Unmarshal(message, &messageStruct); err != nil {
				panic(err)
			}
			votes.Clear()
			for _, estimateData := range messageStruct.Payload.Estimates {
				user := estimateData.User
				score := estimateData.Estimate
				entry := generateVoteText(score, user)
				votes.AddItem(entry, 0, 1, true)
			}
			card.SetCellSimple(0, 1, messageStruct.Payload.PointAvg)

		case types.MessageIssueSuggested:
			var suggestedMsg types.IssueSuggestedMessage
			if err := json.Unmarshal(message, &suggestedMsg); err != nil {
				log.Println("Error parsing issue suggested:", err)
				break
			}

			// Store in pending issue state
			payload := suggestedMsg.Payload
			if payload.Source == "linear" {
				SetPendingIssue(&PendingIssue{
					Identifier:  payload.Identifier,
					Title:       payload.Title,
					Description: payload.Description,
					URL:         payload.URL,
					QueueIndex:  payload.QueueIndex,
					FromLinear:  true,
					HasMore:     payload.HasMore,
				})
				log.Printf("Received Linear issue suggestion: %s", payload.Identifier)
			} else if payload.Source == "system" {
				// No more issues
				ClearPendingIssue()
				log.Println(payload.Title)
			}

		case types.MessageIssueLoaded:
			var loadedMsg types.IssueLoadedMessage
			if err := json.Unmarshal(message, &loadedMsg); err != nil {
				log.Println("Error parsing issue loaded:", err)
				break
			}

			// Clear pending issue
			ClearPendingIssue()
			card.SetTitle("Current Issue: " + loadedMsg.Payload.Title)
			log.Printf("Issue loaded: %s", loadedMsg.Payload.Identifier)

		case types.MessageIssueStale:
			var messageStruct types.Message
			if err := json.Unmarshal(message, &messageStruct); err != nil {
				log.Println("Error parsing stale message:", err)
				break
			}
			log.Printf("Issue queue changed: %s", messageStruct.Payload)

		case types.ParticipantCount:
			var messageStruct types.Message
			if err := json.Unmarshal(message, &messageStruct); err != nil {
				break
			}
			card.SetCellSimple(1, 1, messageStruct.Payload)

		case types.CurrentIssue:
			var messageStruct types.Message
			if err := json.Unmarshal(message, &messageStruct); err != nil {
				break
			}
			card.SetTitle("Current Issue: " + messageStruct.Payload)
			currentIssueDescription = "No description available"

		case types.ClearBoard:
			card.SetTitle("Current Issue: None")
			card.SetCellSimple(0, 1, "0")
		}

		app.Draw()
	}
}
