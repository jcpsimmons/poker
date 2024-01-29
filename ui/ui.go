package ui

import (
	"github.com/rivo/tview"
)

func PokerMainScreen() {
	app := tview.NewApplication()

	// Create a flexRow layout that centers the logo and tracks application size
	flexRow := tview.NewFlex().SetDirection(tview.FlexRow)
	innerFlexColRight := tview.NewFlex().SetDirection(tview.FlexColumn)
	innerFlexColLeft := tview.NewFlex().SetDirection(tview.FlexColumn)

	card := pokerCard(0)
	estimationForm := estimationForm(app)
	hostForm := hostForm(app)
	sessionInfo := sessionInfo("localhost:8080", "jsimmons")

	innerFlexColRight.AddItem(estimationForm, 0, 1, true)
	innerFlexColRight.AddItem(sessionInfo, 0, 1, false)

	innerFlexColLeft.AddItem(hostForm, 0, 1, false)
	innerFlexColLeft.AddItem(card, 0, 1, false)

	flexRow.AddItem(innerFlexColLeft, 0, 1, false)
	flexRow.AddItem(innerFlexColRight, 0, 2, true)

	// Start the application
	if err := app.SetRoot(flexRow, true).Run(); err != nil {
		panic(err)
	}

}

func hostForm(app *tview.Application) *tview.Form {
	form := tview.NewForm().
		AddInputField("Host Name", "", 20, nil, nil).
		AddInputField("Port", "", 20, nil, nil)
	form.SetBorder(true).SetTitle("Host Tools").SetTitleAlign(tview.AlignLeft)
	return form
}

func estimationForm(app *tview.Application) *tview.Form {
	form := tview.NewForm().
		AddDropDown("Estimate", []string{"1", "2", "3", "5", "8", "13"}, 0, nil).
		AddTextView("Notes", "Enter your estimate then press ENTER to send. Press H to view estimate key.", 40, 2, true, false)
	form.SetBorder(true).SetTitle("Estimate Story").SetTitleAlign(tview.AlignLeft)
	return form
}

func pokerCard(estimate int32) *tview.Box {
	card := tview.NewTextView().
		SetText("Estimate: " + string(estimate)).SetBorder(true).SetTitle("Poker Card").SetTitleAlign(tview.AlignLeft)
	return card
}

func sessionInfo(address string, username string) *tview.Box {
	sessionDataView := tview.NewTextView().
		SetText("Address: " + address + "\nUsername: " + username).SetBorder(true).SetTitle("Session Info").SetTitleAlign(tview.AlignLeft)
	return sessionDataView
}
