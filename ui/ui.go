package ui

import (
	"fmt"

	"github.com/jcpsimmons/poker/messaging"

	"github.com/gdamore/tcell/v2"

	"github.com/rivo/tview"
)

func PokerClientMainView(isHost bool, username, serverAddr string) {
	connection := connect(serverAddr)
	defer connection.Close()
	messaging.JoinSession(connection, username, isHost)

	app := tview.NewApplication()

	// Create a flexRow layout that centers the logo and tracks application size
	flexRow := tview.NewFlex().SetDirection(tview.FlexColumnCSS)
	innerFlexRowBottom := tview.NewFlex().SetDirection(tview.FlexRowCSS)
	innerFlexRowTop := tview.NewFlex().SetDirection(tview.FlexRowCSS)

	currentIssue := generateScoreCard()

	statusBar := generateStatusBar(serverAddr, username)
	estimationForm := generateEstimationForm(app, connection, isHost)
	votes := generateVotes()
	innerFlexRowBottom.AddItem(estimationForm, 0, 1, true)

	var hostTools *tview.TextView
	if isHost {
		hostTools = generateHostForm(app, connection)
		innerFlexRowTop.AddItem(hostTools, 0, 1, false)
	}

	outermostFlex := tview.NewFlex().SetDirection(tview.FlexColumnCSS)

	innerFlexRowTop.AddItem(currentIssue, 0, 1, false)

	flexRow.AddItem(innerFlexRowTop, 0, 1, false)
	flexRow.AddItem(innerFlexRowBottom, 0, 2, true)

	scoreboardFlex := tview.NewFlex().SetDirection(tview.FlexRowCSS).AddItem(flexRow, 0, 3, true).AddItem(votes, 0, 1, false)

	outermostFlex.AddItem(scoreboardFlex, 0, 1, false)
	outermostFlex.AddItem(statusBar, 1, 0, false)

	pages := tview.NewPages().AddPage("main", outermostFlex, true, true)
	modal, modalInputField := generateModal(app, connection, pages)
	pages.AddPage("modal", modal, true, false)

	// Create description modal
	descriptionModal := generateDescriptionModal(pages)
	pages.AddPage("description", descriptionModal, true, false)

	app.SetInputCapture(func(event *tcell.EventKey) *tcell.EventKey {
		curTopPage, _ := pages.GetFrontPage()

		if event.Rune() == 'q' {
			app.Stop()
		}

		if !isHost {
			app.SetFocus(estimationForm)
		}

		if isHost && curTopPage != "modal" {
			app.SetFocus(estimationForm)
			switch event.Rune() {
			case 'u':
				// Open modal with pending issue if available
				pending := GetPendingIssue()
				if pending != nil && pending.FromLinear {
					// Pre-fill with Linear issue
					issueText := fmt.Sprintf("%s: %s", pending.Identifier, pending.Title)
					modalInputField.SetText(issueText)
					UpdateModalDescription(pages, pending.Description, pending.URL, pending.HasMore)
					UpdateModalTitle(pages, fmt.Sprintf("Update Issue - Linear: %s", pending.Identifier))
				} else {
					// Empty modal for custom entry
					modalInputField.SetText("")
					UpdateModalDescription(pages, "", "", false)
					UpdateModalTitle(pages, "Update Issue")
				}
				pages.ShowPage("modal")
				app.SetFocus(modalInputField)
				return nil
			case 'r':
				messaging.RevealRound(connection)
			}
		}

		// Description modal hotkey (works for everyone)
		if event.Rune() == 'd' && curTopPage == "main" {
			pages.ShowPage("description")
			return nil
		}

		// Close description modal
		if curTopPage == "description" && (event.Key() == tcell.KeyEscape || event.Rune() == 'd') {
			pages.HidePage("description")
			return nil
		}

		return event
	})

	go messageListener(app, connection, currentIssue, votes)

	// Start the application
	if err := app.SetRoot(pages, true).Run(); err != nil {
		panic(err)
	}

}
