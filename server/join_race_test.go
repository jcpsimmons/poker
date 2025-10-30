package server

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/jcpsimmons/poker/types"
	"github.com/stretchr/testify/require"
)

// TestConcurrentDuplicateUsernameJoin tests race condition when two clients
// try to join with the same username simultaneously
func TestConcurrentDuplicateUsernameJoin(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	var wg sync.WaitGroup
	results := make(chan bool, 2)

	// Function to attempt join
	attemptJoin := func(username string) {
		defer wg.Done()

		conn := connectTestClient(t, ts.URL)
		defer conn.Close()

		joinMsg := types.JoinMessage{
			Type: types.Join,
			Payload: types.JoinPayload{
				Username: username,
				IsHost:   false,
			},
		}

		err := conn.WriteJSON(joinMsg)
		if err != nil {
			results <- false
			return
		}

		// Read messages until we find joinError (failure) or currentIssue (success)
		// currentIssue is sent directly only to successfully joined clients
		conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		for i := 0; i < 10; i++ {
			var msg map[string]interface{}
			err := conn.ReadJSON(&msg)
			if err != nil {
				results <- false
				return
			}

			msgType := types.MessageType(msg["type"].(string))
			if msgType == types.JoinError {
				results <- false
				return
			}
			if msgType == types.CurrentIssue {
				// Success - we got currentIssue (sent directly to joined client)
				results <- true
				return
			}
		}
		// If we didn't see joinError or currentIssue, assume failure
		results <- false
	}

	// Launch two goroutines trying to join as "Alice"
	wg.Add(2)
	go attemptJoin("Alice")
	go attemptJoin("Alice")

	wg.Wait()
	close(results)

	// Collect results
	successCount := 0
	failCount := 0
	for result := range results {
		if result {
			successCount++
		} else {
			failCount++
		}
	}

	// Exactly one should succeed, one should fail
	// The logic is fixed - atomic check-and-set ensures only one can join
	require.Equal(t, 1, successCount, "Expected exactly one successful join")
	require.Equal(t, 1, failCount, "Expected exactly one failed join")

	// Note: We don't check the map here because test clients disconnect immediately
	// The success/fail counts above verify the logic is working correctly
}

// TestConcurrentMultipleHostJoin tests race condition when two clients
// try to join as host simultaneously
func TestConcurrentMultipleHostJoin(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	var wg sync.WaitGroup
	results := make(chan bool, 2)

	attemptHostJoin := func(username string) {
		defer wg.Done()

		conn := connectTestClient(t, ts.URL)
		defer conn.Close()

		joinMsg := types.JoinMessage{
			Type: types.Join,
			Payload: types.JoinPayload{
				Username: username,
				IsHost:   true,
			},
		}

		err := conn.WriteJSON(joinMsg)
		if err != nil {
			results <- false
			return
		}

		// Read messages until we find joinError (failure) or currentIssue (success)
		// currentIssue is sent directly only to successfully joined clients
		conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		for i := 0; i < 10; i++ {
			var msg map[string]interface{}
			err := conn.ReadJSON(&msg)
			if err != nil {
				results <- false
				return
			}

			msgType := types.MessageType(msg["type"].(string))
			if msgType == types.JoinError {
				results <- false
				return
			}
			if msgType == types.CurrentIssue {
				// Success - we got currentIssue (sent directly to joined client)
				results <- true
				return
			}
		}
		// If we didn't see joinError or currentIssue, assume failure
		results <- false
	}

	// Launch two goroutines trying to join as host
	wg.Add(2)
	go attemptHostJoin("Host1")
	go attemptHostJoin("Host2")

	wg.Wait()
	close(results)

	// Collect results
	successCount := 0
	failCount := 0
	for result := range results {
		if result {
			successCount++
		} else {
			failCount++
		}
	}

	// Exactly one should succeed as host
	// The logic is fixed - atomic check ensures only one host can join
	require.Equal(t, 1, successCount, "Expected exactly one successful host join")
	require.Equal(t, 1, failCount, "Expected exactly one failed host join")

	// Note: We don't check the map here because test clients disconnect immediately
	// The success/fail counts above verify the logic is working correctly
}

// TestConcurrentMixedJoins tests race conditions with mixed join scenarios
func TestConcurrentMixedJoins(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	var wg sync.WaitGroup
	results := make(chan string, 10)

	attemptJoin := func(username string, isHost bool) {
		defer wg.Done()

		conn := connectTestClient(t, ts.URL)
		defer conn.Close()

		joinMsg := types.JoinMessage{
			Type: types.Join,
			Payload: types.JoinPayload{
				Username: username,
				IsHost:   isHost,
			},
		}

		err := conn.WriteJSON(joinMsg)
		if err != nil {
			results <- "error"
			return
		}

		// Read messages until we find joinError (rejected) or currentIssue (success)
		// currentIssue is sent directly to successfully joined clients only
		conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		for i := 0; i < 10; i++ {
			var msg map[string]interface{}
			err := conn.ReadJSON(&msg)
			if err != nil {
				results <- "error"
				return
			}

			msgType := types.MessageType(msg["type"].(string))
			if msgType == types.JoinError {
				results <- "rejected"
				return
			}
			// currentIssue is sent directly only to successfully joined clients
			if msgType == types.CurrentIssue {
				results <- "success"
				return
			}
		}
		// If we didn't see joinError or currentIssue, assume error
		results <- "error"
	}

	// Launch 10 concurrent join attempts:
	// - 3 tries for username "Alice" (2 should fail)
	// - 3 tries for username "Bob" (2 should fail)
	// - 3 tries to join as host (2 should fail)
	// - 1 valid unique username
	wg.Add(10)
	go attemptJoin("Alice", false)   // 1
	go attemptJoin("Alice", false)   // duplicate
	go attemptJoin("alice", false)   // duplicate (case-insensitive)
	go attemptJoin("Bob", false)     // 2
	go attemptJoin("Bob", false)     // duplicate
	go attemptJoin("BOB", false)     // duplicate (case-insensitive)
	go attemptJoin("Host1", true)    // host
	go attemptJoin("Host2", true)    // second host (should fail)
	go attemptJoin("Host3", true)    // third host (should fail)
	go attemptJoin("Charlie", false) // 3

	wg.Wait()
	close(results)

	// Collect results
	successCount := 0
	rejectCount := 0
	errorCount := 0
	for result := range results {
		switch result {
		case "success":
			successCount++
		case "rejected":
			rejectCount++
		case "error":
			errorCount++
		}
	}

	// Should have 4 successes (Alice, Bob, Host1, Charlie)
	// and 6 rejections (duplicates and extra hosts)
	// The logic is fixed - atomic checks ensure proper validation
	require.Equal(t, 0, errorCount, "Should have no connection errors")
	require.Equal(t, 4, successCount, "Expected 4 successful joins")
	require.Equal(t, 6, rejectCount, "Expected 6 rejected joins")

	// Note: We don't check the map here because test clients disconnect immediately
	// The success/reject counts above verify the logic is working correctly
}

// TestRaceDetectorOnJoin runs join operations with race detector to catch data races
// Run with: go test -race ./server/... -run TestRaceDetectorOnJoin
func TestRaceDetectorOnJoin(t *testing.T) {
	setupTestServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	var wg sync.WaitGroup

	// Launch multiple concurrent joins with different usernames
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			conn := connectTestClient(t, ts.URL)
			defer conn.Close()

			joinMsg := types.JoinMessage{
				Type: types.Join,
				Payload: types.JoinPayload{
					Username: "User" + string(rune('A'+id)),
					IsHost:   false,
				},
			}

			conn.WriteJSON(joinMsg)

			// Read some messages
			for j := 0; j < 3; j++ {
				var msg types.Message
				conn.ReadJSON(&msg)
			}
		}(i)
	}

	wg.Wait()

	// If race detector is enabled and there's a race, the test will fail
	time.Sleep(100 * time.Millisecond)
}
