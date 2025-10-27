package discovery

import (
	"context"
	"fmt"
	"net"
	"time"

	"github.com/grandcat/zeroconf"
)

// DiscoverSessions discovers all available poker sessions via mDNS
// Returns a list of discovered sessions
func DiscoverSessions(ctx context.Context, timeout time.Duration) ([]*Session, error) {
	resolver, err := zeroconf.NewResolver(nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create resolver: %w", err)
	}

	reenable := make(chan *zeroconf.ServiceEntry, 100)
	go func(reenable <-chan *zeroconf.ServiceEntry) {
		for range reenable {
			// Re-enable multicast reception by draining the channel
		}
	}(reenable)

	entries := make(chan *zeroconf.ServiceEntry, 10)
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	err = resolver.Browse(ctx, "_poker._tcp", "local.", entries)
	if err != nil {
		return nil, fmt.Errorf("failed to browse services: %w", err)
	}

	var sessions []*Session
	sessionMap := make(map[string]*Session)

	for {
		select {
		case <-ctx.Done():
			// Return what we've collected
			for _, session := range sessionMap {
				sessions = append(sessions, session)
			}
			return sessions, nil
		case entry := <-entries:
			if entry == nil {
				// Channel closed
				continue
			}

			// Create or update session
			key := fmt.Sprintf("%s:%d", entry.HostName, entry.Port)
			session, exists := sessionMap[key]

			if !exists {
				session = &Session{
					Name:  entry.Instance,
					Host:  entry.HostName,
					Port:  entry.Port,
					Addrs: make([]net.IP, 0),
				}
				sessionMap[key] = session
			}

			// Add IPv4 addresses
			for _, addr := range entry.AddrIPv4 {
				session.Addrs = append(session.Addrs, addr)
			}

			// Add IPv6 addresses
			for _, addr := range entry.AddrIPv6 {
				session.Addrs = append(session.Addrs, addr)
			}
		}
	}
}
