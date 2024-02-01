package ui

import (
	"jsimmons/poker/messaging"
	"log"
	"strconv"

	"github.com/gorilla/websocket"
	"github.com/rivo/tview"
)

func generateHostForm(app *tview.Application, conn *websocket.Conn) *tview.Form {
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

func generateEstimationForm(app *tview.Application, conn *websocket.Conn, isHost bool) *tview.Form {
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

	titleAlign := tview.AlignCenter

	if isHost {
		titleAlign = tview.AlignLeft
	}

	form.SetBorder(true).SetTitle("Estimate Story").SetTitleAlign(titleAlign)
	return form
}

func generatePokerCard() *tview.Table {
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

func generateModal() *tview.Flex {
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

func generateSessionInfo(address string, username string) *tview.Form {
	form := tview.NewForm().
		AddInputField("Host Name", address, 20, nil, nil).
		AddInputField("Port", username, 20, nil, nil)
	form.SetBorder(true).SetTitle("Connection Info").SetTitleAlign(tview.AlignLeft)
	return form
}
