package linear

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

type LinearClient struct {
	httpClient *http.Client
	apiKey     string
	apiURL     string
}

type LinearIssue struct {
	ID          string
	Identifier  string
	Title       string
	Description string
	URL         string
	Estimate    *int64
}

type CycleInfo struct {
	TeamKey   string
	CycleType string // "upcoming", "current", or a specific cycle name
}

// NewClient creates a new Linear API client
func NewClient(apiKey string) *LinearClient {
	return &LinearClient{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		apiKey:     apiKey,
		apiURL:     "https://api.linear.app/graphql",
	}
}

// executeQuery executes a GraphQL query against the Linear API
func (c *LinearClient) executeQuery(ctx context.Context, query string, result interface{}) error {
	reqBody := map[string]string{"query": query}
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal query: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != 200 {
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var graphqlResp struct {
		Data   json.RawMessage          `json:"data"`
		Errors []map[string]interface{} `json:"errors,omitempty"`
	}

	if err := json.Unmarshal(body, &graphqlResp); err != nil {
		return fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if len(graphqlResp.Errors) > 0 {
		return fmt.Errorf("GraphQL errors: %v", graphqlResp.Errors)
	}

	if err := json.Unmarshal(graphqlResp.Data, result); err != nil {
		return fmt.Errorf("failed to unmarshal data: %w", err)
	}

	return nil
}

// ParseCycleURL extracts team key and cycle information from a Linear URL
// Supports formats like:
// - https://linear.app/customerio/team/CDP/cycle/upcoming
// - https://linear.app/customerio/team/CDP/cycle/current
func ParseCycleURL(cycleURL string) (*CycleInfo, error) {
	parsedURL, err := url.Parse(cycleURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	// Extract path segments
	path := strings.Trim(parsedURL.Path, "/")

	// Expected format: /{org}/team/{teamKey}/cycle/{cycleType}
	re := regexp.MustCompile(`^[^/]+/team/([^/]+)/cycle/(.+)$`)
	matches := re.FindStringSubmatch(path)
	if len(matches) < 3 {
		return nil, fmt.Errorf("invalid cycle URL format, expected: linear.app/{org}/team/{team}/cycle/{type}")
	}

	return &CycleInfo{
		TeamKey:   matches[1],
		CycleType: matches[2],
	}, nil
}

// FetchCycleIssuesWithoutEstimates queries Linear for issues in a cycle without estimates
func (c *LinearClient) FetchCycleIssuesWithoutEstimates(cycleInfo *CycleInfo) ([]LinearIssue, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Step 1: Get teams
	teamsQueryStr := `{
		teams(first: 100) {
			nodes {
				id
				key
				name
			}
		}
	}`

	var teamsResult struct {
		Teams struct {
			Nodes []struct {
				ID   string `json:"id"`
				Key  string `json:"key"`
				Name string `json:"name"`
			} `json:"nodes"`
		} `json:"teams"`
	}

	if err := c.executeQuery(ctx, teamsQueryStr, &teamsResult); err != nil {
		return nil, fmt.Errorf("failed to fetch teams: %w", err)
	}

	// Find the team with matching key
	var teamID string
	for _, team := range teamsResult.Teams.Nodes {
		if team.Key == cycleInfo.TeamKey {
			teamID = team.ID
			break
		}
	}

	if teamID == "" {
		return nil, fmt.Errorf("team with key '%s' not found", cycleInfo.TeamKey)
	}

	// Step 2: Get cycles for all teams with date info to determine current vs upcoming
	cyclesQueryStr := `{
		organization {
			teams(first: 100) {
				nodes {
					id
					cycles(first: 50) {
						nodes {
							id
							name
							number
							startsAt
							endsAt
						}
					}
				}
			}
		}
	}`

	var cyclesResult struct {
		Organization struct {
			Teams struct {
				Nodes []struct {
					ID     string `json:"id"`
					Cycles struct {
						Nodes []struct {
							ID       string `json:"id"`
							Name     string `json:"name"`
							Number   int    `json:"number"`
							StartsAt string `json:"startsAt"`
							EndsAt   string `json:"endsAt"`
						} `json:"nodes"`
					} `json:"cycles"`
				} `json:"nodes"`
			} `json:"teams"`
		} `json:"organization"`
	}

	if err := c.executeQuery(ctx, cyclesQueryStr, &cyclesResult); err != nil {
		return nil, fmt.Errorf("failed to fetch cycles: %w", err)
	}

	// Find cycles for our team and match by type
	var cycleID string
	now := time.Now()

	for _, team := range cyclesResult.Organization.Teams.Nodes {
		if team.ID != teamID {
			continue
		}

		// Match based on cycle type
		if cycleInfo.CycleType == "upcoming" {
			// Find the FIRST cycle that hasn't started yet (the next upcoming cycle)
			var earliestUpcoming *struct {
				ID       string
				StartsAt time.Time
			}

			for _, cycle := range team.Cycles.Nodes {
				startsAt, err := time.Parse(time.RFC3339, cycle.StartsAt)
				if err == nil && startsAt.After(now) {
					if earliestUpcoming == nil || startsAt.Before(earliestUpcoming.StartsAt) {
						earliestUpcoming = &struct {
							ID       string
							StartsAt time.Time
						}{
							ID:       cycle.ID,
							StartsAt: startsAt,
						}
					}
				}
			}

			if earliestUpcoming != nil {
				cycleID = earliestUpcoming.ID
			}
		} else if cycleInfo.CycleType == "current" {
			// Find cycle that has started but not ended (current)
			for _, cycle := range team.Cycles.Nodes {
				startsAt, errStart := time.Parse(time.RFC3339, cycle.StartsAt)
				endsAt, errEnd := time.Parse(time.RFC3339, cycle.EndsAt)
				if errStart == nil && errEnd == nil && startsAt.Before(now) && endsAt.After(now) {
					cycleID = cycle.ID
					break
				}
			}
		} else {
			// Match by name
			for _, cycle := range team.Cycles.Nodes {
				if strings.EqualFold(cycle.Name, cycleInfo.CycleType) {
					cycleID = cycle.ID
					break
				}
			}
		}
		break
	}

	if cycleID == "" {
		return nil, fmt.Errorf("no matching cycle found for '%s' in team %s", cycleInfo.CycleType, cycleInfo.TeamKey)
	}

	// Get issues without estimates for this cycle
	issuesQueryStr := fmt.Sprintf(`{
		issues(first: 100, filter: { cycle: { id: { eq: "%s" } }, estimate: { null: true } }) {
			nodes {
				id
				identifier
				title
				description
				url
				estimate
			}
		}
	}`, cycleID)

	var issuesResult struct {
		Issues struct {
			Nodes []struct {
				ID          string `json:"id"`
				Identifier  string `json:"identifier"`
				Title       string `json:"title"`
				Description string `json:"description"`
				URL         string `json:"url"`
				Estimate    *int64 `json:"estimate"`
			} `json:"nodes"`
		} `json:"issues"`
	}

	if err := c.executeQuery(ctx, issuesQueryStr, &issuesResult); err != nil {
		return nil, fmt.Errorf("failed to fetch issues: %w", err)
	}

	issues := make([]LinearIssue, 0, len(issuesResult.Issues.Nodes))
	for _, node := range issuesResult.Issues.Nodes {
		issues = append(issues, LinearIssue{
			ID:          node.ID,
			Identifier:  node.Identifier,
			Title:       node.Title,
			Description: node.Description,
			URL:         node.URL,
			Estimate:    node.Estimate,
		})
	}

	return issues, nil
}

// PostComment adds a comment to a Linear issue with voting breakdown
func (c *LinearClient) PostComment(issueID string, commentBody string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Escape the comment body for GraphQL
	escapedBody := strings.ReplaceAll(commentBody, `"`, `\"`)
	escapedBody = strings.ReplaceAll(escapedBody, "\n", "\\n")

	mutationStr := fmt.Sprintf(`
		mutation {
			commentCreate(input: {
				issueId: "%s"
				body: "%s"
			}) {
				success
				comment {
					id
				}
			}
		}
	`, issueID, escapedBody)

	var result struct {
		CommentCreate struct {
			Success bool `json:"success"`
			Comment *struct {
				ID string `json:"id"`
			} `json:"comment"`
		} `json:"commentCreate"`
	}

	if err := c.executeQuery(ctx, mutationStr, &result); err != nil {
		return fmt.Errorf("failed to post comment: %w", err)
	}

	if !result.CommentCreate.Success {
		return fmt.Errorf("comment creation was not successful")
	}

	return nil
}
