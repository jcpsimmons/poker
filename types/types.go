package types

type MessageType string

const (
	Join     MessageType = "join"
	Estimate MessageType = "estimate"
	Leave    MessageType = "leave"
	Reveal   MessageType = "reveal"
	Reset    MessageType = "reset"
	NewIssue MessageType = "newIssue"
	// server messages to client
	CurrentIssue     MessageType = "currentIssue"
	ParticipantCount MessageType = "participantCount"
	RevealData       MessageType = "revealData"
	CurrentEstimate  MessageType = "currentEstimate"
	ClearBoard       MessageType = "clearBoard"
)

type Message struct {
	Type    MessageType `json:"type"`
	Payload string      `json:"payload"`
}

type UserEstimate struct {
	User     string `json:"user"`
	Estimate string `json:"estimate"`
}

type RevealPayload struct {
	Estimates []UserEstimate `json:"estimates"`
	PointAvg  string         `json:"pointAvg"`
}

type RevealMessage struct {
	Type    MessageType   `json:"type"`
	Payload RevealPayload `json:"payload"`
}

// LinearIssue represents a Linear issue with all relevant metadata
type LinearIssue struct {
	ID          string `json:"id"`
	Identifier  string `json:"identifier"`
	Title       string `json:"title"`
	Description string `json:"description"`
	URL         string `json:"url"`
}

// CurrentIssuePayload includes both the issue text and optional Linear metadata
type CurrentIssuePayload struct {
	Text        string       `json:"text"`
	LinearIssue *LinearIssue `json:"linearIssue,omitempty"`
}

// IssueRevealData stores voting results for a specific issue
type IssueRevealData struct {
	IssueIdentifier string         `json:"issueIdentifier"`
	IssueID         string         `json:"issueId"`
	Estimates       []UserEstimate `json:"estimates"`
	Average         int64          `json:"average"`
	RoundedEstimate int64          `json:"roundedEstimate"`
}
