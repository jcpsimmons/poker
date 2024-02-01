package ui

import (
	"fmt"
	"strings"
)

func formatBottomCommand(command string) string {
	firstChar := fmt.Sprintf("[lime:gray:b]%s[::-]", strings.ToUpper(command[0:1]))
	return firstChar + command[1:] + "[-:-:-:-]"
}

func hotKeyFormat(hotKey string) string {
	return fmt.Sprintf("[::bu]%s[::-]", hotKey)
}
