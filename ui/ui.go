package ui

import (
	"github.com/jcpsimmons/poker/messaging"

	"github.com/gdamore/tcell/v2"

	"github.com/rivo/tview"
)

func PokerClientMainView(isHost bool, username, serverAddr string) {
	connection := connect(serverAddr)
	defer connection.Close()
	messaging.JoinSession(connection, username)

	app := tview.NewApplication()

	// Create a flexRow layout that centers the logo and tracks application size
	flexRow := tview.NewFlex().SetDirection(tview.FlexRow)
	innerFlexRowBottom := tview.NewFlex().SetDirection(tview.FlexColumn)
	innerFlexRowTop := tview.NewFlex().SetDirection(tview.FlexColumn)

	card := generatePokerCard()

	estimationForm := generateEstimationForm(app, connection, isHost)
	sessionInfo := generateSessionInfo(serverAddr, username)
	innerFlexRowBottom.AddItem(estimationForm, 0, 1, true)

	var hostForm *tview.TextView
	if isHost {
		hostForm = generateHostForm(app, connection)
		innerFlexRowBottom.AddItem(hostForm, 0, 1, false)
	}

	innerFlexRowTop.AddItem(sessionInfo, 0, 1, false)
	innerFlexRowTop.AddItem(card, 0, 1, false)

	flexRow.AddItem(innerFlexRowTop, 0, 1, false)
	flexRow.AddItem(innerFlexRowBottom, 0, 2, true)

	pages := tview.NewPages().AddPage("main", flexRow, true, true)
	modal := generateModal(app, connection, pages)
	pages.AddPage("modal", modal, true, false)

	app.SetInputCapture(func(event *tcell.EventKey) *tcell.EventKey {
		curTopPage, _ := pages.GetFrontPage()

		if event.Rune() == 'q' {
			app.Stop()
		}

		if isHost && curTopPage != "modal" {
			switch event.Rune() {
			case 'u':
				pages.ShowPage("modal")
				return nil
			case 'c':
				messaging.ResetBoard(connection)
			case 'r':
				messaging.RevealRound(connection)
			}
		}

		return event

		// // how do I keep track of state?
		// form := tview.NewForm().
		// 	AddInputField("Issue", "", 20, nil, nil)

		// form.AddButton("Update Issue", func() {
		// 	inputEl := form.GetFormItem(0).(*tview.InputField)
		// 	text := inputEl.GetText()
		// 	messaging.NewIssue(conn, text)
		// 	inputEl.SetText("")
		// }).AddButton("Clear Board", func() {
		// 	messaging.ResetBoard(conn)
		// }).AddButton("Reveal Round", func() {
		// 	messaging.RevealRound(conn)
		// })
		// form.SetBorder(true).SetTitle("H"+hotKeyFormat("o")+"st Tools").SetTitleAlign(tview.AlignLeft).
		// 	SetBorderPadding(1, 1, 1, 1)
	})

	go messageListener(app, connection, card)

	// Start the application
	if err := app.SetRoot(pages, true).Run(); err != nil {
		panic(err)
	}

}
