package ui

import "sync"

// PendingIssue stores the details of the next issue suggested to the host
type PendingIssue struct {
	Identifier  string
	Title       string
	Description string
	URL         string
	QueueIndex  int
	FromLinear  bool
	HasMore     bool
}

var pendingIssue *PendingIssue
var pendingIssueMutex sync.RWMutex

// SetPendingIssue stores a new pending issue in a thread-safe manner
func SetPendingIssue(issue *PendingIssue) {
	pendingIssueMutex.Lock()
	defer pendingIssueMutex.Unlock()
	pendingIssue = issue
}

// GetPendingIssue retrieves the current pending issue in a thread-safe manner
func GetPendingIssue() *PendingIssue {
	pendingIssueMutex.RLock()
	defer pendingIssueMutex.RUnlock()
	return pendingIssue
}

// ClearPendingIssue removes the pending issue in a thread-safe manner
func ClearPendingIssue() {
	pendingIssueMutex.Lock()
	defer pendingIssueMutex.Unlock()
	pendingIssue = nil
}
