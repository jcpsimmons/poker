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
