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
	VoteStatus       MessageType = "voteStatus"
	JoinError        MessageType = "joinError"
	// Linear queue management
	MessageIssueSuggested MessageType = "issueSuggested"
	MessageIssueConfirm   MessageType = "issueConfirm"
	MessageIssueLoaded    MessageType = "issueLoaded"
	MessageIssueStale     MessageType = "issueStale"
	// Queue management
	MessageQueueSync    MessageType = "queueSync"
	MessageQueueAdd     MessageType = "queueAdd"
	MessageQueueUpdate  MessageType = "queueUpdate"
	MessageQueueDelete  MessageType = "queueDelete"
	MessageQueueReorder MessageType = "queueReorder"
	// Linear estimate assignment
	MessageAssignEstimate MessageType = "assignEstimate"
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

type VoterInfo struct {
	Username string `json:"username"`
	HasVoted bool   `json:"hasVoted"`
}

type VoteStatusPayload struct {
	Voters []VoterInfo `json:"voters"`
}

type VoteStatusMessage struct {
	Type    MessageType       `json:"type"`
	Payload VoteStatusPayload `json:"payload"`
}

// LinearIssue represents a Linear issue with all relevant metadata
type LinearIssue struct {
	ID          string `json:"id"`
	Identifier  string `json:"identifier"`
	Title       string `json:"title"`
	Description string `json:"description"`
	URL         string `json:"url"`
	Priority    *int64 `json:"priority,omitempty"`
}

// QueueItem represents an item in the voting queue (Linear or custom)
type QueueItem struct {
	ID          string `json:"id"`
	Source      string `json:"source"` // "linear" | "custom"
	Identifier  string `json:"identifier"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	URL         string `json:"url,omitempty"`
	LinearID    string `json:"linearId,omitempty"` // For Linear issues only
	Index       int    `json:"index"`
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

// QueueSyncPayload contains the full queue state
type QueueSyncPayload struct {
	Items []QueueItem `json:"items"`
}

// QueueSyncMessage wraps QueueSyncPayload
type QueueSyncMessage struct {
	Type    MessageType      `json:"type"`
	Payload QueueSyncPayload `json:"payload"`
}

// QueueAddPayload for adding a custom item to queue
type QueueAddPayload struct {
	Identifier  string `json:"identifier"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	Index       *int   `json:"index,omitempty"` // Optional position (default: end)
}

// QueueAddMessage wraps QueueAddPayload
type QueueAddMessage struct {
	Type    MessageType     `json:"type"`
	Payload QueueAddPayload `json:"payload"`
}

// QueueUpdatePayload for updating a queue item (custom only)
type QueueUpdatePayload struct {
	ID          string `json:"id"`
	Identifier  string `json:"identifier,omitempty"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
}

// QueueUpdateMessage wraps QueueUpdatePayload
type QueueUpdateMessage struct {
	Type    MessageType        `json:"type"`
	Payload QueueUpdatePayload `json:"payload"`
}

// QueueDeletePayload for removing an item from queue
type QueueDeletePayload struct {
	ID string `json:"id"`
}

// QueueDeleteMessage wraps QueueDeletePayload
type QueueDeleteMessage struct {
	Type    MessageType        `json:"type"`
	Payload QueueDeletePayload `json:"payload"`
}

// QueueReorderPayload for reordering queue items
type QueueReorderPayload struct {
	ItemIDs []string `json:"itemIds"` // Array of IDs in new order
}

// QueueReorderMessage wraps QueueReorderPayload
type QueueReorderMessage struct {
	Type    MessageType         `json:"type"`
	Payload QueueReorderPayload `json:"payload"`
}
