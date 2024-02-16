package ui

import (
	"sort"
	"strconv"
	"strings"

	"github.com/jcpsimmons/poker/messaging"

	"github.com/gdamore/tcell/v2"
	"github.com/gorilla/websocket"
	"github.com/rivo/tview"
)

func generateHostForm(app *tview.Application, conn *websocket.Conn) *tview.TextView {
	hostMethods := []string{"Update Issue", "Reveal Round"}
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
	form.AddInputField("Issue", "", 0, nil, nil)
	form.SetInputCapture(func(event *tcell.EventKey) *tcell.EventKey {
		if event.Key() == tcell.KeyEscape {
			pages.HidePage("modal")
			return nil
		}
		if event.Key() == tcell.KeyEnter {
			formText := form.GetFormItem(0).(*tview.InputField).GetText()
			messaging.NewIssue(conn, formText)
			pages.HidePage("modal")
		}
		return event
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
		3:  "Full day",
		5:  "2-3 days + communication",
		8:  "A week",
		13: "This ticket needs broken down",
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

func generateScoreCard() *tview.Table {
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

func generateVoteText(score string, user string) *tview.TextView {
	scoreText := tview.NewTextView().SetText(score + " - " + user)
	return scoreText
}

func generateVotes() *tview.Flex {
	flex := tview.NewFlex()

	flex.SetDirection(tview.FlexColumnCSS).SetTitle("Votes").SetTitleAlign(tview.AlignLeft)
	flex.SetBorderPadding(1, 1, 1, 1)
	flex.SetBorder(true)
	return flex
}

func generateStatusBar(address string, username string) *tview.Flex {
	lText := tview.NewTextView()
	rText := tview.NewTextView()
	lText.SetDynamicColors(true).SetText("[white::b]Connected to Host: " + address).SetBackgroundColor(tcell.ColorDarkGreen)
	rText.SetDynamicColors(true).SetText("[white::b]Username: " + username).SetBackgroundColor(tcell.ColorDarkGreen)

	flex := tview.NewFlex().SetDirection(tview.FlexRowCSS)
	flex.AddItem(lText, 0, 1, false)
	flex.AddItem(rText, 0, 1, false)
	flex.SetBackgroundColor(tcell.ColorLimeGreen)

	return flex
}
