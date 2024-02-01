package ui

import (
	"jsimmons/poker/messaging"

	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
)

func PokerClientMainView(isHost bool, username, serverAddr string) {
	connection := connect(serverAddr)
	defer connection.Close()
	messaging.JoinSession(connection, username)

	app := tview.NewApplication()

	isModalVisible := false

	// Create a flexRow layout that centers the logo and tracks application size
	flexRow := tview.NewFlex().SetDirection(tview.FlexRow)
	innerFlexColRight := tview.NewFlex().SetDirection(tview.FlexColumn)
	innerFlexColLeft := tview.NewFlex().SetDirection(tview.FlexColumn)

	modal := generateModal()
	card := generatePokerCard()

	estimationForm := generateEstimationForm(app, connection, isHost)
	sessionInfo := generateSessionInfo(serverAddr, username)
	innerFlexColRight.AddItem(estimationForm, 0, 1, true)

	var hostForm *tview.Form
	if isHost {
		hostForm = generateHostForm(app, connection)
		innerFlexColRight.AddItem(hostForm, 0, 1, false)
	}

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
