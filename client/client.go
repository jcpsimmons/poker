package client

import (
	"encoding/json"
	"log"

	"jsimmons/poker/server"

	"github.com/gorilla/websocket"
	"github.com/rivo/tview"
)

func Init(username string, serverAddr string) {
	connection := connect(serverAddr)
	defer connection.Close()

	// register user
	sendMessage(server.Join, username, connection)

	app := tview.NewApplication()
	form := tview.NewForm().
		AddTextView("Issue", "blah", 10, 10, true, false).
		AddDropDown("Estimate", []string{"1", "2", "3", "5", "8", "13"}, 0, nil)

	// tview:= tview.NewTextView().SetTitle("Info").SetBorder(true)

	layout := tview.NewFlex().
		SetDirection(tview.FlexRow).
		AddItem(form, 0, 1, true).
		SetBorder(true).
		SetTitle("Planning Poker")

	if err := app.SetRoot(layout, true).SetFocus(form).Run(); err != nil {
		log.Fatal(err)
	}
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
