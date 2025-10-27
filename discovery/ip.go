package discovery

import (
	"fmt"
	"os/exec"
	"path/filepath"
)

// GetTailscaleIPv4 attempts to get the Tailscale IPv4 address
// Returns the IP and true if successful, empty string and false otherwise
func GetTailscaleIPv4() (string, bool) {
	// Try common Tailscale CLI locations
	cliPaths := []string{
		"tailscale", // In PATH
		"/Applications/Tailscale.app/Contents/MacOS/Tailscale", // macOS
	}

	for _, cliPath := range cliPaths {
		if ip, ok := tryTailscaleCLI(cliPath); ok {
			return ip, true
		}
	}

	return "", false
}

func tryTailscaleCLI(cliPath string) (string, bool) {
	// Check if the file exists (for absolute paths location)
	if filepath.IsAbs(cliPath) {
		if _, err := exec.LookPath(cliPath); err != nil {
			return "", false
		}
	}

	// Try to get IPv4 from Tailscale CLI
	cmd := exec.Command(cliPath, "ip", "-4")
	output, err := cmd.Output()
	if err != nil {
		return "", false
	}

	ip := string(output)
	if ip == "" {
		return "", false
	}

	// Remove trailing newline
	ip = fmt.Sprintf("%.15s", ip) // IPv4 max length is 15 chars

	return ip, true
}
