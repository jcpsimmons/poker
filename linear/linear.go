package linear

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/hasura/go-graphql-client"
)

type LinearClient struct {
	client *graphql.Client
	apiKey string
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
	client := graphql.NewClient("https://api.linear.app/graphql", nil).WithRequestModifier(func(r *http.Request) {
		r.Header.Set("Authorization", apiKey)
		r.Header.Set("Content-Type", "application/json")
	})
	return &LinearClient{
		client: client,
		apiKey: apiKey,
	}
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

	// First, get the team
	teamQuery := &struct {
		Team struct {
			ID   string `graphql:"id"`
			Name string `graphql:"name"`
		} `graphql:"team(key: $teamKey)"`
	}{}

	err := c.client.Query(ctx, teamQuery, map[string]interface{}{
		"teamKey": cycleInfo.TeamKey,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch team: %w", err)
	}

	teamID := teamQuery.Team.ID

	// Get cycles for the team
	type cycleNode struct {
		ID    string `graphql:"id"`
		Name  string `graphql:"name"`
		State string `graphql:"state"`
	}

	cyclesQuery := &struct {
		Team struct {
			Cycles struct {
				Nodes []cycleNode `graphql:"nodes"`
			} `graphql:"cycles"`
		} `graphql:"team(id: $teamId)"`
	}{}

	err = c.client.Query(ctx, cyclesQuery, map[string]interface{}{
		"teamId": teamID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch cycles: %w", err)
	}

	// Find the matching cycle based on cycleType
	var cycleID string
	for _, cycle := range cyclesQuery.Team.Cycles.Nodes {
		if cycleInfo.CycleType == "upcoming" && cycle.State == "upcoming" {
			cycleID = cycle.ID
			break
		} else if cycleInfo.CycleType == "current" && cycle.State == "started" {
			cycleID = cycle.ID
			break
		} else if strings.EqualFold(cycle.Name, cycleInfo.CycleType) {
			cycleID = cycle.ID
			break
		}
	}

	if cycleID == "" {
		return nil, fmt.Errorf("no matching cycle found for '%s' in team %s", cycleInfo.CycleType, cycleInfo.TeamKey)
	}

	// Now fetch issues from that cycle without estimates
	type issueNode struct {
		ID          string `graphql:"id"`
		Identifier  string `graphql:"identifier"`
		Title       string `graphql:"title"`
		Description string `graphql:"description"`
		URL         string `graphql:"url"`
		Estimate    *int64 `graphql:"estimate"`
	}

	issuesQuery := &struct {
		Issues struct {
			Nodes []issueNode `graphql:"nodes"`
		} `graphql:"issues(filter: $filter)"`
	}{}

	err = c.client.Query(ctx, issuesQuery, map[string]interface{}{
		"filter": map[string]interface{}{
			"cycle": map[string]interface{}{
				"id": map[string]interface{}{
					"eq": cycleID,
				},
			},
			"estimate": map[string]interface{}{
				"eq": nil,
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch issues: %w", err)
	}

	issues := make([]LinearIssue, 0, len(issuesQuery.Issues.Nodes))
	for _, node := range issuesQuery.Issues.Nodes {
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

	mutation := &struct {
		CommentCreate struct {
			Success bool `graphql:"success"`
			Comment *struct {
				ID string `graphql:"id"`
			} `graphql:"comment"`
		} `graphql:"commentCreate(input: $input)"`
	}{}

	err := c.client.Mutate(ctx, mutation, map[string]interface{}{
		"input": map[string]interface{}{
			"issueId":   issueID,
			"body":      commentBody,
			"variables": map[string]interface{}{},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to post comment: %w", err)
	}

	return nil
}
