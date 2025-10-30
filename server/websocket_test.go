package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jcpsimmons/poker/types"
	"github.com/stretchr/testify/require"
)

func TestWebSocketJoinFlow(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	conn := connectTestClient(t, ts.URL)
	defer conn.Close()

	// Send join message
	joinMsg := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "TestUser",
			IsHost:   false,
		},
	}
	err := conn.WriteJSON(joinMsg)
	require.NoError(t, err)

	// Expect to receive: currentIssue, currentEstimate, participantCount, voteStatus, queueSync
	messagesReceived := make(map[types.MessageType]bool)

	for i := 0; i < 5; i++ {
		conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		require.NoError(t, err)

		msgType := types.MessageType(msg["type"].(string))

		// Should not receive joinError
		require.NotEqual(t, types.JoinError, msgType)

		messagesReceived[msgType] = true
	}

	// Verify we received the expected message types
	require.True(t, messagesReceived[types.CurrentIssue], "Should receive currentIssue")
	require.True(t, messagesReceived[types.ParticipantCount], "Should receive participantCount")
	require.True(t, messagesReceived[types.VoteStatus], "Should receive voteStatus")
}

func TestWebSocketJoinError_InvalidUsername(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	conn := connectTestClient(t, ts.URL)
	defer conn.Close()

	// Send join with invalid username (single character)
	joinMsg := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "x",
			IsHost:   false,
		},
	}
	err := conn.WriteJSON(joinMsg)
	require.NoError(t, err)

	// Should receive joinError
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	var msg types.Message
	err = conn.ReadJSON(&msg)
	require.NoError(t, err)
	require.Equal(t, types.JoinError, msg.Type)
	require.Contains(t, msg.Payload, "must be at least 2 characters")

	// Connection should close
	conn.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, _, err = conn.ReadMessage()
	require.Error(t, err)
	require.True(t, websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseAbnormalClosure))
}

func TestWebSocketJoinError_DuplicateUsername(t *testing.T) {
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

	// Read welcome messages
	for i := 0; i < 5; i++ {
		conn1.SetReadDeadline(time.Now().Add(2 * time.Second))
		var msg types.Message
		conn1.ReadJSON(&msg)
	}

	// Second client tries same username
	conn2 := connectTestClient(t, ts.URL)
	defer conn2.Close()

	joinMsg2 := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "Alice",
			IsHost:   false,
		},
	}
	err = conn2.WriteJSON(joinMsg2)
	require.NoError(t, err)

	// Should receive joinError
	conn2.SetReadDeadline(time.Now().Add(2 * time.Second))
	var msg types.Message
	err = conn2.ReadJSON(&msg)
	require.NoError(t, err)
	require.Equal(t, types.JoinError, msg.Type)
	require.Contains(t, msg.Payload, "username is already taken")

	// Second connection should close
	conn2.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, _, err = conn2.ReadMessage()
	require.Error(t, err)
}

func TestWebSocketVoteFlow(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	// Join two players
	conn1 := connectTestClient(t, ts.URL)
	defer conn1.Close()
	conn2 := connectTestClient(t, ts.URL)
	defer conn2.Close()

	// Player 1 joins
	joinMsg1 := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "Alice",
			IsHost:   true,
		},
	}
	conn1.WriteJSON(joinMsg1)

	// Read welcome messages for player 1
	for i := 0; i < 5; i++ {
		var msg map[string]interface{}
		conn1.ReadJSON(&msg)
	}

	// Player 2 joins
	joinMsg2 := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "Bob",
			IsHost:   false,
		},
	}
	conn2.WriteJSON(joinMsg2)

	// Read welcome messages for player 2 and broadcast for player 1
	for i := 0; i < 6; i++ {
		var msg map[string]interface{}
		conn2.ReadJSON(&msg)
	}

	// Clear player 1's message queue (participantCount + voteStatus from Bob joining)
	conn1.SetReadDeadline(time.Now().Add(1 * time.Second))
	for i := 0; i < 3; i++ {
		var msg map[string]interface{}
		err := conn1.ReadJSON(&msg)
		if err != nil {
			break
		}
	}

	// Player 1 votes
	estimateMsg := types.Message{
		Type:    types.Estimate,
		Payload: "5",
	}
	conn1.WriteJSON(estimateMsg)

	// Give server time to process and broadcast
	time.Sleep(200 * time.Millisecond)

	// Both should receive voteStatus update
	conn1.SetReadDeadline(time.Now().Add(2 * time.Second))
	var voteStatusMsg map[string]interface{}
	voteErr := conn1.ReadJSON(&voteStatusMsg)
	require.NoError(t, voteErr, "Should be able to read voteStatus message")
	require.Equal(t, string(types.VoteStatus), voteStatusMsg["type"].(string), "Should receive voteStatus after voting")

	// Host reveals
	revealMsg := types.Message{
		Type:    types.Reveal,
		Payload: "",
	}
	conn1.WriteJSON(revealMsg)

	// Should receive revealData
	conn1.SetReadDeadline(time.Now().Add(2 * time.Second))
	var revealDataMsg map[string]interface{}
	err := conn1.ReadJSON(&revealDataMsg)
	require.NoError(t, err)
	require.Equal(t, string(types.RevealData), revealDataMsg["type"].(string))
}

func TestWebSocketMultipleClients(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	// Create 5 clients
	conns := make([]*websocket.Conn, 5)
	for i := 0; i < 5; i++ {
		conn := connectTestClient(t, ts.URL)
		defer conn.Close()
		conns[i] = conn

		joinMsg := types.JoinMessage{
			Type: types.Join,
			Payload: types.JoinPayload{
				Username: "User" + string(rune('A'+i)),
				IsHost:   i == 0, // First is host
			},
		}
		conn.WriteJSON(joinMsg)

		// Read welcome messages
		for j := 0; j < 5+i; j++ { // More messages as more clients join
			conn.SetReadDeadline(time.Now().Add(2 * time.Second))
			var msg types.Message
			conn.ReadJSON(&msg)
		}
	}

	// Verify all clients are connected
	mutex.Lock()
	clientCount := len(clients)
	mutex.Unlock()
	require.Equal(t, 5, clientCount)

	// Disconnect one client
	conns[2].Close()

	// Give time for disconnect handler
	time.Sleep(200 * time.Millisecond)

	// Verify client was removed
	mutex.Lock()
	clientCount = len(clients)
	mutex.Unlock()
	require.Equal(t, 4, clientCount)
}

func TestWebSocketResetFlow(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	// Join as host
	conn := connectTestClient(t, ts.URL)
	defer conn.Close()

	joinMsg := types.JoinMessage{
		Type: types.Join,
		Payload: types.JoinPayload{
			Username: "Host",
			IsHost:   true,
		},
	}
	conn.WriteJSON(joinMsg)

	// Read welcome messages
	for i := 0; i < 5; i++ {
		var msg types.Message
		conn.ReadJSON(&msg)
	}

	// Vote
	estimateMsg := types.Message{
		Type:    types.Estimate,
		Payload: "5",
	}
	conn.WriteJSON(estimateMsg)

	// Read voteStatus
	var msg types.Message
	conn.ReadJSON(&msg)

	// Reset
	resetMsg := types.Message{
		Type:    types.Reset,
		Payload: "",
	}
	conn.WriteJSON(resetMsg)

	// Should receive clearBoard and voteStatus
	messagesReceived := make(map[types.MessageType]bool)
	for i := 0; i < 2; i++ {
		conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		require.NoError(t, err)
		msgType := types.MessageType(msg["type"].(string))
		messagesReceived[msgType] = true
	}

	require.True(t, messagesReceived[types.ClearBoard], "Should receive clearBoard")
	require.True(t, messagesReceived[types.VoteStatus], "Should receive voteStatus")

	// Verify votes were cleared
	mutex.Lock()
	for client := range clients {
		require.Equal(t, int64(0), client.CurrentEstimate, "Votes should be cleared")
	}
	mutex.Unlock()
}
