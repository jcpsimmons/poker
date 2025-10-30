package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jcpsimmons/poker/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Test helper to create a WebSocket client for testing
func connectTestClient(t *testing.T, serverURL string) *websocket.Conn {
	wsURL := "ws" + strings.TrimPrefix(serverURL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	return conn
}

func TestHandleJoin_ValidJoin(t *testing.T) {
	setupTestServer()

	// Create test HTTP server
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	// Connect and join
	conn := connectTestClient(t, ts.URL)
	defer conn.Close()

	joinMsg := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "TestUser",
			IsHost:   false,
		},
	}

	err := conn.WriteJSON(joinMsg)
	require.NoError(t, err)

	// Read welcome messages (currentIssue, currentEstimate, participantCount, voteStatus, queueSync)
	for i := 0; i < 5; i++ {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		require.NoError(t, err)

		// Should NOT receive a joinError
		msgType := types.MessageType(msg["type"].(string))
		require.NotEqual(t, types.JoinError, msgType)
	}

	// Verify client was added
	mutex.Lock()
	clientCount := len(clients)
	var foundClient *Client
	for client := range clients {
		if client.UserID == "TestUser" {
			foundClient = client
			break
		}
	}
	mutex.Unlock()

	require.Equal(t, 1, clientCount)
	require.NotNil(t, foundClient)
	require.Equal(t, "TestUser", foundClient.UserID)
	require.False(t, foundClient.IsHost)
}

func TestHandleJoin_ValidHostJoin(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	conn := connectTestClient(t, ts.URL)
	defer conn.Close()

	joinMsg := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "HostUser",
			IsHost:   true,
		},
	}

	err := conn.WriteJSON(joinMsg)
	require.NoError(t, err)

	// Read welcome messages
	for i := 0; i < 5; i++ {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		require.NoError(t, err)
		msgType := types.MessageType(msg["type"].(string))
		require.NotEqual(t, types.JoinError, msgType)
	}

	// Verify host was added
	mutex.Lock()
	var foundHost *Client
	for client := range clients {
		if client.UserID == "HostUser" && client.IsHost {
			foundHost = client
			break
		}
	}
	mutex.Unlock()

	require.NotNil(t, foundHost)
	require.True(t, foundHost.IsHost)
}

func TestHandleJoin_InvalidUsername(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	conn := connectTestClient(t, ts.URL)
	defer conn.Close()

	// Try to join with single character username (invalid)
	joinMsg := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "a",
			IsHost:   false,
		},
	}

	err := conn.WriteJSON(joinMsg)
	require.NoError(t, err)

	// Should receive joinError
	var msg types.Message
	err = conn.ReadJSON(&msg)
	require.NoError(t, err)
	require.Equal(t, types.JoinError, msg.Type)
	require.Contains(t, msg.Payload, "must be at least 2 characters")

	// Connection should close
	_, _, err = conn.ReadMessage()
	require.Error(t, err)

	// Verify client was NOT added
	mutex.Lock()
	clientCount := len(clients)
	mutex.Unlock()
	require.Equal(t, 0, clientCount)
}

func TestHandleJoin_DuplicateUsername(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	// First client joins successfully
	conn1 := connectTestClient(t, ts.URL)
	defer conn1.Close()

	joinMsg1 := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "Alice",
			IsHost:   false,
		},
	}

	err := conn1.WriteJSON(joinMsg1)
	require.NoError(t, err)

	// Read welcome messages for first client
	for i := 0; i < 5; i++ {
		var msg types.Message
		conn1.ReadJSON(&msg)
	}

	// Second client tries to join with same username (case-insensitive)
	conn2 := connectTestClient(t, ts.URL)
	defer conn2.Close()

	joinMsg2 := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "alice", // lowercase
			IsHost:   false,
		},
	}

	err = conn2.WriteJSON(joinMsg2)
	require.NoError(t, err)

	// Should receive joinError
	var msg types.Message
	err = conn2.ReadJSON(&msg)
	require.NoError(t, err)
	require.Equal(t, types.JoinError, msg.Type)
	require.Contains(t, msg.Payload, "username is already taken")

	// Verify only one client exists
	mutex.Lock()
	clientCount := len(clients)
	mutex.Unlock()
	require.Equal(t, 1, clientCount)
}

func TestHandleJoin_MultipleHostRejection(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	// First host joins successfully
	conn1 := connectTestClient(t, ts.URL)
	defer conn1.Close()

	joinMsg1 := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "Host1",
			IsHost:   true,
		},
	}

	err := conn1.WriteJSON(joinMsg1)
	require.NoError(t, err)

	// Read welcome messages
	for i := 0; i < 5; i++ {
		var msg types.Message
		conn1.ReadJSON(&msg)
	}

	// Second client tries to join as host
	conn2 := connectTestClient(t, ts.URL)
	defer conn2.Close()

	joinMsg2 := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "Host2",
			IsHost:   true,
		},
	}

	err = conn2.WriteJSON(joinMsg2)
	require.NoError(t, err)

	// Should receive joinError
	var msg types.Message
	err = conn2.ReadJSON(&msg)
	require.NoError(t, err)
	require.Equal(t, types.JoinError, msg.Type)
	require.Contains(t, msg.Payload, "a host is already in this session")

	// Verify only one client (host) exists
	mutex.Lock()
	hostCount := 0
	for client := range clients {
		if client.IsHost {
			hostCount++
		}
	}
	mutex.Unlock()
	require.Equal(t, 1, hostCount)
}

func TestHandleJoin_HostRejoinsAfterDisconnect(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	// First host joins
	conn1 := connectTestClient(t, ts.URL)

	joinMsg1 := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "Host1",
			IsHost:   true,
		},
	}

	conn1.WriteJSON(joinMsg1)

	// Read welcome messages
	for i := 0; i < 5; i++ {
		var msg types.Message
		conn1.ReadJSON(&msg)
	}

	// First host disconnects
	conn1.Close()

	// Give time for disconnect handler to run
	require.Eventually(t, func() bool {
		mutex.Lock()
		defer mutex.Unlock()
		return len(clients) == 0
	}, 1*time.Second, 100*time.Millisecond)

	// New host should be able to join
	conn2 := connectTestClient(t, ts.URL)
	defer conn2.Close()

	joinMsg2 := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "Host2",
			IsHost:   true,
		},
	}

	err := conn2.WriteJSON(joinMsg2)
	require.NoError(t, err)

	// Should NOT receive joinError
	for i := 0; i < 5; i++ {
		var msg map[string]interface{}
		err := conn2.ReadJSON(&msg)
		require.NoError(t, err)
		msgType := types.MessageType(msg["type"].(string))
		require.NotEqual(t, types.JoinError, msgType)
	}

	// Verify new host was added
	mutex.Lock()
	hostFound := false
	for client := range clients {
		if client.IsHost && client.UserID == "Host2" {
			hostFound = true
			break
		}
	}
	mutex.Unlock()
	require.True(t, hostFound)
}

func TestIsUsernameTaken_CaseInsensitive(t *testing.T) {
	setupTestServer()

	// Create a mock client and add to map
	mutex.Lock()
	mockClient := &Client{
		UserID:          "Alice",
		CurrentEstimate: 0,
		IsHost:          false,
	}
	clients[mockClient] = true
	mutex.Unlock()

	// Test case-insensitive matching
	assert.True(t, isUsernameTaken("Alice"))
	assert.True(t, isUsernameTaken("alice"))
	assert.True(t, isUsernameTaken("ALICE"))
	assert.True(t, isUsernameTaken("aLiCe"))
	assert.False(t, isUsernameTaken("Bob"))

	setupTestServer() // Clean up
}

func TestHasHost(t *testing.T) {
	setupTestServer()

	// Initially no host
	assert.False(t, hasHost())

	// Add a non-host client
	mutex.Lock()
	client1 := &Client{
		UserID: "Player",
		IsHost: false,
	}
	clients[client1] = true
	mutex.Unlock()

	assert.False(t, hasHost())

	// Add a host client
	mutex.Lock()
	client2 := &Client{
		UserID: "Host",
		IsHost: true,
	}
	clients[client2] = true
	mutex.Unlock()

	assert.True(t, hasHost())

	setupTestServer() // Clean up
}

func TestHandleJoin_OldFormatCompatibility(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	conn := connectTestClient(t, ts.URL)
	defer conn.Close()

	// Send old format join message (just username as string payload)
	oldFormatMsg := map[string]interface{}{
		"type":    "join",
		"payload": "OldFormatUser",
	}

	msgBytes, _ := json.Marshal(oldFormatMsg)
	err := conn.WriteMessage(websocket.TextMessage, msgBytes)
	require.NoError(t, err)

	// Read welcome messages
	for i := 0; i < 5; i++ {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		require.NoError(t, err)
		msgType := types.MessageType(msg["type"].(string))
		require.NotEqual(t, types.JoinError, msgType)
	}

	// Verify client was added (not as host)
	mutex.Lock()
	var foundClient *Client
	for client := range clients {
		if client.UserID == "OldFormatUser" {
			foundClient = client
			break
		}
	}
	mutex.Unlock()

	require.NotNil(t, foundClient)
	require.False(t, foundClient.IsHost) // Old format defaults to non-host
}
