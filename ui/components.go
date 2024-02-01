package ui

import (
	"jsimmons/poker/messaging"
	"sort"
	"strconv"
	"strings"

	"github.com/gdamore/tcell/v2"
	"github.com/gorilla/websocket"
	"github.com/rivo/tview"
)

func generateHostForm(app *tview.Application, conn *websocket.Conn) *tview.TextView {
	hostMethods := []string{"Update Issue", "Reveal Round", "Clear Board"}
	for i, method := range hostMethods {
		firstChar := hotKeyFormat(method[0:1])
		rest := method[1:]
		hostMethods[i] = firstChar + rest
	}
	options := strings.Join(hostMethods, "\n")
	text := tview.NewTextView().SetDynamicColors(true).SetText(options)
	text.SetBorder(true).SetTitle("Host Tools").SetTitleAlign(tview.AlignLeft).SetBorderPadding(1, 1, 1, 1)
	return text
}

func generateModal(app *tview.Application, conn *websocket.Conn, pages *tview.Pages) *tview.Flex {

	form := tview.NewForm()
	form.AddInputField("Issue", "", 0, nil, nil).AddButton("Submit", func() {
		formText := form.GetFormItem(0).(*tview.InputField).GetText()
		messaging.NewIssue(conn, formText)
		pages.HidePage("modal")
	}).AddButton("Cancel", func() {
		pages.HidePage("modal")
	})

	form.SetBorder(true).SetTitle("New Issue").SetTitleAlign(tview.AlignLeft).SetBorderPadding(1, 1, 1, 1).SetBackgroundColor(tcell.ColorLimeGreen)

	return tview.NewFlex().
		AddItem(nil, 0, 1, false).
		AddItem(tview.NewFlex().SetDirection(tview.FlexRow).
			AddItem(nil, 0, 1, false).
			AddItem(form, 0, 1, true).
			AddItem(nil, 0, 1, false), 0, 1, true).
		AddItem(nil, 0, 1, false)

}

func generateEstimationForm(app *tview.Application, conn *websocket.Conn, isHost bool) *tview.Flex {

	listOptions := map[int64]string{
		1:  "To do list item",
		2:  "Part of a day",
		3:  "full day",
		5:  "2-3 days + communication",
		8:  "a week",
		13: "this ticket needs broken down",
	}
	keys := make([]int64, 0, len(listOptions))
	for k := range listOptions {
		keys = append(keys, k)
	}

	sort.Slice(keys, func(i, j int) bool { return keys[i] < keys[j] })

	list := tview.NewList()

	for i := range keys {
		key := keys[i]
		value := listOptions[int64(key)]
		list.AddItem(value, strconv.Itoa(int(key)), 0, func() {
			messaging.Estimate(conn, int64(key))
		})
	}

	titleAlign := tview.AlignCenter

	if isHost {
		titleAlign = tview.AlignLeft
	}

	list.SetTitle("Estimate Story").SetTitleAlign(titleAlign)

	info := tview.NewTextView().SetDynamicColors(true).SetText("[blue:gray:bi]Instructions\n\n[::-][::i]Use UP and DOWN arrows to select an estimate.\n\nPress ENTER to submit.")
	info.SetTitle("Instructions").SetTitleAlign(tview.AlignLeft).SetBorderPadding(0, 0, 1, 1)

	flex := tview.NewFlex().AddItem(info, 0, 1, false).AddItem(list, 0, 1, true)
	flex.SetBorder(true)
	flex.SetTitle("Estimation").SetTitleAlign(tview.AlignLeft).SetBorderPadding(1, 1, 1, 1)
	return flex
}

func generatePokerCard() *tview.Table {
	table := tview.NewTable()
	table.SetCellSimple(0, 0, "Estimate:").
		SetCellSimple(0, 1, "0").
		SetCellSimple(1, 0, "Participants:").
		SetCellSimple(1, 1, "0").
		SetBorder(true)
	table.SetTitle("Current Issue: None").SetTitleAlign(tview.AlignLeft)
	table.SetBorderPadding(1, 1, 1, 1)
	return table
}

func generateSessionInfo(address string, username string) *tview.Form {
	form := tview.NewForm().
		AddInputField("Host Name", address, 0, nil, nil).
		AddInputField("Username", username, 0, nil, nil)
	form.SetBorder(true).SetTitle("Connection Info").SetTitleAlign(tview.AlignLeft).SetBorderPadding(1, 1, 1, 1)
	return form
}
