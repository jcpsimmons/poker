package discovery

import (
	"fmt"
	"time"

	"github.com/grandcat/zeroconf"
)

// AnnounceSession announces a poker session via mDNS
// Returns a shutdown function to stop the announcement
func AnnounceSession(name string, port int) (func(), error) {
	// Get Tailscale IP to include in the announcement
	tsIP, hasTS := GetTailscaleIPv4()

	txtRecords := []string{
		"ver=1",
	}

	if hasTS {
		txtRecords = append(txtRecords, fmt.Sprintf("tsip=%s", tsIP))
	}

	server, err := zeroconf.Register(name, "_poker._tcp", "local.", port, txtRecords, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to announce session: %w", err)
	}

	shutdown := func() {
		if server != nil {
			server.Shutdown()
		}
	}

	return shutdown, nil
}

// AnnounceSessionWithTimeout announces a session for a specific duration
func AnnounceSessionWithTimeout(name string, port int, duration time.Duration) (func(), error) {
	shutdown, err := AnnounceSession(name, port)
	if err != nil {
		return nil, err
	}

	// Set up automatic shutdown after duration
	timer := time.AfterFunc(duration, shutdown)

	return func() {
		timer.Stop()
		shutdown()
	}, nil
}
