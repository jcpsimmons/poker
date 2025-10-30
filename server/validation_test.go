package server

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidateUsername(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		expected    string
		expectError bool
		errorMsg    string
	}{
		{
			name:        "empty string",
			input:       "",
			expected:    "",
			expectError: true,
			errorMsg:    "username is required",
		},
		{
			name:        "single character",
			input:       "a",
			expected:    "",
			expectError: true,
			errorMsg:    "must be at least 2 characters",
		},
		{
			name:        "valid 2-character name",
			input:       "ab",
			expected:    "ab",
			expectError: false,
		},
		{
			name:        "valid 20-character name",
			input:       "12345678901234567890",
			expected:    "12345678901234567890",
			expectError: false,
		},
		{
			name:        "21-character name",
			input:       "123456789012345678901",
			expected:    "",
			expectError: true,
			errorMsg:    "must be 20 characters or less",
		},
		{
			name:        "alphanumeric with spaces",
			input:       "John Doe",
			expected:    "John Doe",
			expectError: false,
		},
		{
			name:        "alphanumeric with hyphens",
			input:       "user-123",
			expected:    "user-123",
			expectError: false,
		},
		{
			name:        "alphanumeric with underscores",
			input:       "user_123",
			expected:    "user_123",
			expectError: false,
		},
		{
			name:        "mixed valid characters",
			input:       "Alice_B-123",
			expected:    "Alice_B-123",
			expectError: false,
		},
		{
			name:        "special character exclamation",
			input:       "user!",
			expected:    "",
			expectError: true,
			errorMsg:    "can only contain letters, numbers",
		},
		{
			name:        "special character at sign",
			input:       "user@domain",
			expected:    "",
			expectError: true,
			errorMsg:    "can only contain letters, numbers",
		},
		{
			name:        "special character hash",
			input:       "user#123",
			expected:    "",
			expectError: true,
			errorMsg:    "can only contain letters, numbers",
		},
		{
			name:        "only whitespace",
			input:       "   ",
			expected:    "",
			expectError: true,
			errorMsg:    "username is required",
		},
		{
			name:        "leading whitespace",
			input:       "  alice",
			expected:    "alice",
			expectError: false,
		},
		{
			name:        "trailing whitespace",
			input:       "alice  ",
			expected:    "alice",
			expectError: false,
		},
		{
			name:        "leading and trailing whitespace",
			input:       "  alice  ",
			expected:    "alice",
			expectError: false,
		},
		{
			name:        "unicode character",
			input:       "user™",
			expected:    "",
			expectError: true,
			errorMsg:    "can only contain letters, numbers",
		},
		{
			name:        "emoji",
			input:       "user😀",
			expected:    "",
			expectError: true,
			errorMsg:    "can only contain letters, numbers",
		},
		{
			name:        "case sensitivity preserved",
			input:       "AlIcE",
			expected:    "AlIcE",
			expectError: false,
		},
		{
			name:        "spaces only after trim",
			input:       " - ",
			expected:    "",
			expectError: true,
			errorMsg:    "must be at least 2 characters",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := validateUsername(tt.input)
			if tt.expectError {
				require.Error(t, err)
				require.Contains(t, err.Error(), tt.errorMsg)
				require.Equal(t, tt.expected, result)
			} else {
				require.NoError(t, err)
				require.Equal(t, tt.expected, result)
			}
		})
	}
}
