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
	ParticipantCount MessageType = "participantCount"
	CurrentIssue     MessageType = "currentIssue"
	CurrentEstimate  MessageType = "currentEstimate"
	ClearBoard       MessageType = "clearBoard"
)

type Message struct {
	Type    MessageType `json:"type"`
	Payload string      `json:"payload"`
}
