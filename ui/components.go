package ui

import (
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/jcpsimmons/poker/messaging"

	"github.com/gdamore/tcell/v2"
	"github.com/gorilla/websocket"
	"github.com/rivo/tview"
)

func generateHostForm(app *tview.Application, conn *websocket.Conn) *tview.TextView {
	hostMethods := []string{"update issue", "reveal round"}
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

// Global variables for modal components
var modalDescriptionView *tview.TextView
var modalTitleBox *tview.Box
var isCustomMode bool = false

func generateModal(app *tview.Application, conn *websocket.Conn, pages *tview.Pages) (*tview.Flex, *tview.InputField) {
	// Description preview pane (scrollable)
	modalDescriptionView = tview.NewTextView().
		SetDynamicColors(true).
		SetScrollable(true).
		SetWrap(true)
	modalDescriptionView.SetBorder(true).
		SetTitle("Description Preview").
		SetTitleAlign(tview.AlignLeft).
		SetBorderPadding(0, 0, 1, 1)

	// Input field for issue title
	inputField := tview.NewInputField().
		SetLabel("Issue: ").
		SetFieldWidth(0)
	inputField.SetBorder(false)

	// Helper text
	helperText := tview.NewTextView().
		SetDynamicColors(true).
		SetText("[gray]Press Enter to confirm, Esc to cancel, Tab to toggle custom mode")
	helperText.SetBorder(false)

	// Container for input and helper
	inputContainer := tview.NewFlex().
		SetDirection(tview.FlexRow).
		AddItem(inputField, 1, 0, true).
		AddItem(helperText, 1, 0, false)
	inputContainer.SetBorder(true).
		SetTitle("Update Issue").
		SetTitleAlign(tview.AlignLeft).
		SetBorderPadding(0, 0, 1, 1)

	// Main form container
	formFlex := tview.NewFlex().
		SetDirection(tview.FlexRow).
		AddItem(modalDescriptionView, 12, 0, false). // Fixed height for description
		AddItem(inputContainer, 0, 1, true)

	// Handle input
	inputField.SetInputCapture(func(event *tcell.EventKey) *tcell.EventKey {
		if event.Key() == tcell.KeyEscape {
			pages.HidePage("modal")
			isCustomMode = false
			return nil
		}

		if event.Key() == tcell.KeyTab {
			// Toggle custom mode
			isCustomMode = !isCustomMode
			if isCustomMode {
				inputField.SetText("")
				inputContainer.SetTitle("Update Issue - Custom Mode")
				modalDescriptionView.SetText("[yellow]Custom mode: Enter any issue text")
			} else {
				// Restore Linear issue if available
				pending := GetPendingIssue()
				if pending != nil && pending.FromLinear {
					issueText := fmt.Sprintf("%s: %s", pending.Identifier, pending.Title)
					inputField.SetText(issueText)
					inputContainer.SetTitle(fmt.Sprintf("Update Issue - Linear: %s", pending.Identifier))
				}
			}
			return nil
		}

		if event.Key() == tcell.KeyEnter {
			formText := inputField.GetText()
			if formText == "" {
				return nil
			}

			pending := GetPendingIssue()

			if isCustomMode || pending == nil || !pending.FromLinear {
				// Custom issue
				messaging.SendIssueConfirm(conn, formText, -1, true)
			} else {
				// Linear issue
				messaging.SendIssueConfirm(conn, pending.Identifier, pending.QueueIndex, false)
			}

			pages.HidePage("modal")
			isCustomMode = false
			return nil
		}

		return event
	})

	modalFlex := tview.NewFlex().
		AddItem(nil, 0, 1, false).
		AddItem(tview.NewFlex().SetDirection(tview.FlexRow).
			AddItem(nil, 0, 1, false).
			AddItem(formFlex, 20, 0, true).
			AddItem(nil, 0, 1, false), 80, 0, true).
		AddItem(nil, 0, 1, false)

	return modalFlex, inputField
}

// UpdateModalDescription updates the modal description text
func UpdateModalDescription(pages *tview.Pages, description, url string, hasMore bool) {
	if modalDescriptionView == nil {
		return
	}

	if description == "" {
		modalDescriptionView.SetText("[gray]No description available")
		return
	}

	text := description
	if hasMore && url != "" {
		text += fmt.Sprintf("\n\n[blue]Open in Linear for full description:[white] %s", url)
	}

	modalDescriptionView.SetText(text)
	modalDescriptionView.ScrollToBeginning()
}

// UpdateModalTitle updates the modal title
func UpdateModalTitle(pages *tview.Pages, title string) {
	// Title is updated via the inputContainer in the modal generation
	// This function is here for future extensibility
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

	lflex := tview.NewFlex()

	info := tview.NewTextView().SetDynamicColors(true).SetText("[blue:gray:bi]Instructions\n\n[::-][::i]Use UP and DOWN arrows to select an estimate.\n\nPress ENTER to submit.")
	info.SetTitle("Instructions").SetTitleAlign(tview.AlignLeft).SetBorderPadding(0, 0, 1, 1)

	statusUpdates := tview.NewTextView()
	statusUpdates.SetDynamicColors(true).SetBorder(true).SetTitle("Log").SetTitleAlign(tview.AlignLeft).SetBorderPadding(1, 1, 1, 1)

	lflex.AddItem(info, 0, 1, false)
	lflex.AddItem(statusUpdates, 0, 1, true)
	lflex.SetDirection(tview.FlexColumnCSS)
	lflex.SetBorderPadding(0, 0, 1, 2)

	flex := tview.NewFlex().AddItem(lflex, 0, 1, false).AddItem(list, 0, 1, true)

	for i := range keys {
		key := keys[i]
		value := listOptions[int64(key)]
		list.AddItem(value, strconv.Itoa(int(key)), 0, func() {
			messaging.Estimate(conn, int64(key))
			curStatus := statusUpdates.GetText(true)
			statusUpdates.SetText("Voted " + strconv.Itoa(int(key)) + " Points" + "\n" + curStatus)
		})
	}

	titleAlign := tview.AlignCenter

	if isHost {
		titleAlign = tview.AlignLeft
	}

	list.SetTitle("Estimate Story").SetTitleAlign(titleAlign)

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

// Global variable to store current issue description for the modal
var currentIssueDescription string = ""

func generateDescriptionModal(pages *tview.Pages) *tview.Flex {
	textView := tview.NewTextView()
	textView.SetDynamicColors(true)
	textView.SetText("[yellow]Press ESC or 'd' to close\n\n" + currentIssueDescription)
	textView.SetBorder(true).SetTitle("Issue Description").SetTitleAlign(tview.AlignLeft).SetBorderPadding(1, 1, 1, 1)

	return tview.NewFlex().
		AddItem(nil, 0, 1, false).
		AddItem(tview.NewFlex().SetDirection(tview.FlexRow).
			AddItem(nil, 0, 1, false).
			AddItem(textView, 0, 1, true).
			AddItem(nil, 0, 1, false), 0, 1, true).
		AddItem(nil, 0, 1, false)
}

func generateVoteText(score string, user string) *tview.TextView {
	scoreVal := score
	if scoreVal == "0" {
		scoreVal = "NV"
	}
	scoreText := tview.NewTextView().SetText(scoreVal + " - " + user)
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
