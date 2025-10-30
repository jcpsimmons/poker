package server

import (
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/mock"
)

// MockWebSocketConn is a mock WebSocket connection for testing
type MockWebSocketConn struct {
	mock.Mock
}

func (m *MockWebSocketConn) WriteMessage(messageType int, data []byte) error {
	args := m.Called(messageType, data)
	return args.Error(0)
}

func (m *MockWebSocketConn) ReadMessage() (messageType int, p []byte, err error) {
	args := m.Called()
	return args.Int(0), args.Get(1).([]byte), args.Error(2)
}

func (m *MockWebSocketConn) Close() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockWebSocketConn) SetReadDeadline(t interface{}) error {
	args := m.Called(t)
	return args.Error(0)
}

func (m *MockWebSocketConn) SetWriteDeadline(t interface{}) error {
	args := m.Called(t)
	return args.Error(0)
}

// ResetServerState resets all global server state for testing
func ResetServerState() {
	mutex.Lock()
	defer mutex.Unlock()

	// Close all existing connections
	for client := range clients {
		if client.Conn != nil {
			client.Conn.Close()
		}
	}

	clients = make(map[*Client]bool)
	currentIssue = ""
	linearClient = nil
	linearIssues = nil
	currentIssueIndex = -1
	currentLinearIssue = nil
	pendingQueueIndex = -1
	confirmedIssues = make(map[string]bool)
	queueItems = nil
	currentQueueIndex = -1
	queueItemCounter = 0
	justAssignedEstimate = false
}

// createMockClient creates a Client with a mock WebSocket connection for testing
func createMockClient() (*Client, *MockWebSocketConn) {
	mockConn := new(MockWebSocketConn)
	client := &Client{
		Conn:            (*websocket.Conn)(nil), // We'll use type assertion tricks in tests
		UserID:          "",
		CurrentEstimate: 0,
		IsHost:          false,
	}
	return client, mockConn
}

// setupTestServer initializes a clean test server state
func setupTestServer() {
	ResetServerState()
}
