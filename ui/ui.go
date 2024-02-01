package ui

import (
	"jsimmons/poker/messaging"
	"jsimmons/poker/types"
	"log"
	"strconv"

	"github.com/gdamore/tcell/v2"
	"github.com/gorilla/websocket"
	"github.com/rivo/tview"
)

func PokerClientMainView(username string, serverAddr string) {
	isHost := true
	connection := connect(serverAddr)
	defer connection.Close()
	messaging.JoinSession(connection, username)

	app := tview.NewApplication()

	isModalVisible := false

	// Create a flexRow layout that centers the logo and tracks application size
	flexRow := tview.NewFlex().SetDirection(tview.FlexRow)
	innerFlexColRight := tview.NewFlex().SetDirection(tview.FlexColumn)
	innerFlexColLeft := tview.NewFlex().SetDirection(tview.FlexColumn)

	modal := modal()
	card := pokerCard()
	hostForm := hostForm(app, connection)
	estimationForm := estimationForm(app, connection)
	sessionInfo := sessionInfo(serverAddr, username)
	innerFlexColRight.AddItem(estimationForm, 0, 1, true)
	innerFlexColRight.AddItem(hostForm, 0, 1, false)

	innerFlexColLeft.AddItem(sessionInfo, 0, 1, false)
	innerFlexColLeft.AddItem(card, 0, 1, false)

	flexRow.AddItem(innerFlexColLeft, 0, 1, false)
	flexRow.AddItem(innerFlexColRight, 0, 1, true)
	pages := tview.NewPages().AddPage("main", flexRow, true, true).AddPage("modal", modal, false, false)

	app.SetInputCapture(func(event *tcell.EventKey) *tcell.EventKey {
		if event.Rune() == 'q' {
			app.Stop()
		}

		if isHost && event.Key() == tcell.KeyRight {
			app.SetFocus(hostForm)
		}

		if isHost && event.Key() == tcell.KeyLeft {
			app.SetFocus(estimationForm)
		}

		if event.Rune() == 'h' && app.GetFocus() == estimationForm {
			page := "modal"

			if isModalVisible {
				page = "main"
			}

			isModalVisible = !isModalVisible
			pages.SwitchToPage(page)
		}

		if event.Key() == tcell.KeyEsc && isModalVisible {
			pages.SwitchToPage("main")
		}

		return event
	})

	go messageListener(app, connection, card)

	// Start the application
	if err := app.SetRoot(pages, true).Run(); err != nil {
		panic(err)
	}

}

func hostForm(app *tview.Application, conn *websocket.Conn) *tview.Form {
	// how do I keep track of state?
	form := tview.NewForm().
		AddInputField("Issue", "", 20, nil, nil)

	form.AddButton("Update Issue", func() {
		inputEl := form.GetFormItem(0).(*tview.InputField)
		text := inputEl.GetText()
		messaging.NewIssue(conn, text)
		inputEl.SetText("")
	}).AddButton("Clear Board", func() {
		messaging.ResetBoard(conn)
	}).AddButton("Reveal Round", func() {
		messaging.RevealRound(conn)
	})
	form.SetBorder(true).SetTitle("Host Tools").SetTitleAlign(tview.AlignLeft)
	return form
}

func estimationForm(app *tview.Application, conn *websocket.Conn) *tview.Form {
	form := tview.NewForm().
		AddDropDown("Estimate", []string{"1", "2", "3", "5", "8", "13"}, 0, nil)

	form.AddButton("Send Estimate", func() {

		_, val := form.GetFormItem(0).(*tview.DropDown).GetCurrentOption()
		intVal, err := strconv.ParseInt(val, 10, 32)

		if err != nil {
			log.Fatal(err)
		}

		messaging.Estimate(conn, int32(intVal))
	})

	form.SetBorder(true).SetTitle("Estimate Story").SetTitleAlign(tview.AlignLeft)
	return form
}

func pokerCard() *tview.Table {
	table := tview.NewTable()
	table.SetCellSimple(0, 0, "Current Issue:").
		SetCellSimple(0, 1, "None").
		SetCellSimple(1, 0, "Estimate:").
		SetCellSimple(1, 1, "0").
		SetCellSimple(2, 0, "Participants:").
		SetCellSimple(2, 1, "0").
		SetBorder(true)
	return table
}

func modal() *tview.Flex {
	box := tview.NewBox().
		SetBorder(true).
		SetTitle("Centered Box")

	return tview.NewFlex().
		AddItem(nil, 0, 1, false).
		AddItem(tview.NewFlex().SetDirection(tview.FlexRow).
			AddItem(nil, 0, 1, false).
			AddItem(box, 10, 1, true).
			AddItem(nil, 0, 1, false), 40, 1, true).
		AddItem(nil, 0, 1, false)
}

func sessionInfo(address string, username string) *tview.Form {
	form := tview.NewForm().
		AddInputField("Host Name", address, 20, nil, nil).
		AddInputField("Port", username, 20, nil, nil)
	form.SetBorder(true).SetTitle("Connection Info").SetTitleAlign(tview.AlignLeft)
	return form
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
			card.SetCellSimple(2, 1, messageStruct.Payload)
		case types.CurrentIssue:
			card.SetCellSimple(0, 1, messageStruct.Payload)
		case types.CurrentEstimate:
			card.SetCellSimple(1, 1, messageStruct.Payload)
		case types.ClearBoard:
			card.SetCellSimple(0, 1, "None")
			card.SetCellSimple(1, 1, "0")
		}
		app.Draw()
	}
}
