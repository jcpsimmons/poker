package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jcpsimmons/poker/config"
	"github.com/jcpsimmons/poker/discovery"
	"github.com/jcpsimmons/poker/linear"
	"github.com/jcpsimmons/poker/server"
	"github.com/jcpsimmons/poker/types"

	ngrok "golang.ngrok.com/ngrok/v2"

	"github.com/urfave/cli/v2"
)

func main() {
	app := &cli.App{
		Commands: []*cli.Command{
			{
				Name:    "server",
				Aliases: []string{"s"},
				Usage:   "start a new planning poker instance",
				Flags: []cli.Flag{
					&cli.BoolFlag{
						Name:    "announce",
						Aliases: []string{"a"},
						Usage:   "announce session via mDNS (requires Tailscale)",
					},
					&cli.BoolFlag{
						Name:  "ngrok",
						Usage: "expose server via ngrok (requires NGROK_AUTHTOKEN)",
					},
					&cli.StringFlag{
						Name:    "name",
						Aliases: []string{"n"},
						Usage:   "session name (default: hostname)",
						Value:   "",
					},
					&cli.StringFlag{
						Name:  "port",
						Usage: "port to listen on",
						Value: "9867",
					},
					&cli.StringFlag{
						Name:  "linear-cycle",
						Usage: "Linear cycle URL to pull issues from (e.g., https://linear.app/customerio/team/CDP/cycle/upcoming)",
						Value: "",
					},
				},
				Action: func(cCtx *cli.Context) error {
					port := cCtx.String("port")
					sessionName := cCtx.String("name")
					linearCycleURL := cCtx.String("linear-cycle")

					// Default session name to hostname if not provided
					if sessionName == "" {
						hostname, _ := os.Hostname()
						sessionName = hostname
					}

					// Handle Linear integration if requested
					if linearCycleURL != "" {
						// Load config
						cfg, err := config.Load()
						if err != nil {
							return fmt.Errorf("failed to load config: %w", err)
						}

						// Parse cycle URL
						cycleInfo, err := linear.ParseCycleURL(linearCycleURL)
						if err != nil {
							return fmt.Errorf("failed to parse cycle URL: %w", err)
						}

						// Create Linear client
						linearClient := linear.NewClient(cfg.Linear.APIKey)

						// Fetch issues
						log.Println("Fetching Linear issues...")
						linearIssues, err := linearClient.FetchCycleIssuesWithoutEstimates(cycleInfo)
						if err != nil {
							return fmt.Errorf("failed to fetch Linear issues: %w", err)
						}

						if len(linearIssues) == 0 {
							log.Println("No unestimated issues found in cycle")
						} else {
							log.Printf("Found %d unestimated issue(s) in cycle", len(linearIssues))

							// Convert to server format
							issues := make([]types.LinearIssue, 0, len(linearIssues))
							for _, li := range linearIssues {
								issues = append(issues, types.LinearIssue{
									ID:          li.ID,
									Identifier:  li.Identifier,
									Title:       li.Title,
									Description: li.Description,
									URL:         li.URL,
								})
							}

							// Pass to server
							server.SetLinearIssues(issues, linearClient)
						}
					}

					// Announce session if requested
					if cCtx.Bool("announce") {
						portInt, err := strconv.Atoi(port)
						if err != nil {
							return fmt.Errorf("invalid port: %w", err)
						}

						tsIP, hasTS := discovery.GetTailscaleIPv4()
						if hasTS {
							log.Printf("Tailscale IP detected: %s", tsIP)
						} else {
							log.Println("Tailscale IP not detected - announcing will still work via mDNS")
						}

						shutdown, err := discovery.AnnounceSession(sessionName, portInt)
						if err != nil {
							log.Printf("Warning: Failed to announce session: %v", err)
						} else {
							defer shutdown()
							log.Printf("Announcing session '%s' on port %s", sessionName, port)
						}
					}

					if cCtx.Bool("ngrok") {
						// Serve via ngrok with a random URL each run.
						// Handlers are registered on the default mux so we can pass nil as handler below.
						server.RegisterHandlers()

						if os.Getenv("NGROK_AUTHTOKEN") == "" {
							return fmt.Errorf("NGROK_AUTHTOKEN not set")
						}
						ln, err := ngrok.Listen(context.Background())
						if err != nil {
							return fmt.Errorf("failed to start ngrok listener: %w", err)
						}

						fmt.Printf("Public URL: %s\n", ln.URL())
						wsURL := strings.Replace(ln.URL().String(), "https://", "wss://", 1)
						fmt.Printf("WebSocket endpoint: %s/ws\n", wsURL)
						return http.Serve(ln, nil)
					}

					server.Start(port)
					return nil
				},
			},
			{
				Name:    "discover",
				Aliases: []string{"d"},
				Usage:   "discover available poker sessions",
				Action: func(cCtx *cli.Context) error {
					ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
					defer cancel()

					fmt.Println("Discovering poker sessions...")
					sessions, err := discovery.DiscoverSessions(ctx, 5*time.Second)
					if err != nil {
						return fmt.Errorf("discovery failed: %w", err)
					}

					if len(sessions) == 0 {
						fmt.Println("No poker sessions found")
						return nil
					}

					fmt.Printf("\nFound %d session(s):\n\n", len(sessions))
					fmt.Printf("%-30s %-20s %-10s\n", "Session Name", "Address", "Port")
					fmt.Println(strings.Repeat("-", 70))

					for _, session := range sessions {
						address := session.Address()
						if address == "" {
							address = session.Host
						}
						fmt.Printf("%-30s %-20s %-10d\n", session.Name, address, session.Port)
					}

					return nil
				},
			},
		},
	}

	sort.Sort(cli.FlagsByName(app.Flags))
	sort.Sort(cli.CommandsByName(app.Commands))

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}
