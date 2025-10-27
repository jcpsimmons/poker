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
	// Linear queue management
	MessageIssueSuggested MessageType = "issueSuggested"
	MessageIssueConfirm   MessageType = "issueConfirm"
	MessageIssueLoaded    MessageType = "issueLoaded"
	MessageIssueStale     MessageType = "issueStale"
)

type Message struct {
	Type    MessageType `json:"type"`
	Payload string      `json:"payload"`
}

type JoinPayload struct {
	Username string `json:"username"`
	IsHost   bool   `json:"isHost"`
}

type JoinMessage struct {
	Type    MessageType `json:"type"`
	Payload JoinPayload `json:"payload"`
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

// IssueSuggestedPayload contains details for a suggested issue with versioning
type IssueSuggestedPayload struct {
	Version     int    `json:"version"` // start at 1
	Source      string `json:"source"`  // "linear" | "custom" | "system"
	Identifier  string `json:"identifier"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	URL         string `json:"url,omitempty"`
	QueueIndex  int    `json:"queueIndex"`
	HasMore     bool   `json:"hasMore,omitempty"` // if description truncated
}

// IssueConfirmPayload sent by client to confirm loading an issue
type IssueConfirmPayload struct {
	RequestID  string `json:"requestId"`
	Identifier string `json:"identifier"`
	QueueIndex int    `json:"queueIndex"`
	IsCustom   bool   `json:"isCustom"`
}

// IssueLoadedPayload broadcast when an issue is loaded
type IssueLoadedPayload struct {
	Identifier string `json:"identifier"`
	Title      string `json:"title"`
	QueueIndex int    `json:"queueIndex"`
}

// IssueSuggestedMessage wraps IssueSuggestedPayload
type IssueSuggestedMessage struct {
	Type    MessageType           `json:"type"`
	Payload IssueSuggestedPayload `json:"payload"`
}

// IssueConfirmMessage wraps IssueConfirmPayload
type IssueConfirmMessage struct {
	Type    MessageType         `json:"type"`
	Payload IssueConfirmPayload `json:"payload"`
}

// IssueLoadedMessage wraps IssueLoadedPayload
type IssueLoadedMessage struct {
	Type    MessageType        `json:"type"`
	Payload IssueLoadedPayload `json:"payload"`
}
