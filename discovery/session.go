package discovery

import (
	"net"
)

// Session represents a discovered poker session
type Session struct {
	Name  string
	Host  string
	Port  int
	Addrs []net.IP
}

// Address returns the first available IP address as a string
// Prefers IPv4 if available
func (s *Session) Address() string {
	for _, addr := range s.Addrs {
		if addr.To4() != nil {
			return addr.String()
		}
	}
	if len(s.Addrs) > 0 {
		return s.Addrs[0].String()
	}
	return ""
}
