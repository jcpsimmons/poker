package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jcpsimmons/poker/discovery"
	"github.com/jcpsimmons/poker/server"
	"github.com/jcpsimmons/poker/ui"

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
					&cli.StringFlag{
						Name:    "name",
						Aliases: []string{"n"},
						Usage:   "session name (default: hostname)",
						Value:   "",
					},
					&cli.StringFlag{
						Name:  "port",
						Usage: "port to listen on",
						Value: "8080",
					},
				},
				Action: func(cCtx *cli.Context) error {
					port := cCtx.String("port")
					sessionName := cCtx.String("name")

					// Default session name to hostname if not provided
					if sessionName == "" {
						hostname, _ := os.Hostname()
						sessionName = hostname
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
			{
				Name:    "client",
				Aliases: []string{"c"},
				Usage:   "connect to a planning poker instance",
				Flags: []cli.Flag{
					&cli.BoolFlag{
						Name:    "host",
						Aliases: []string{"o"},
						Usage:   "run in host mode",
						Value:   false,
					},
					&cli.BoolFlag{
						Name:  "auto",
						Usage: "auto-connect to first discovered session",
					},
				},
				Action: func(cCtx *cli.Context) error {
					username := cCtx.Args().First()
					serverAddr := cCtx.Args().Get(1)

					if username == "" {
						return fmt.Errorf("username is required")
					}

					// If no server address provided, try to discover
					if serverAddr == "" {
						ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
						defer cancel()

						fmt.Println("Discovering poker sessions...")
						sessions, err := discovery.DiscoverSessions(ctx, 5*time.Second)
						if err != nil {
							return fmt.Errorf("discovery failed: %w", err)
						}

						if len(sessions) == 0 {
							return fmt.Errorf("no poker sessions found and no server address provided")
						}

						// Auto-connect if flag is set or only one session
						if cCtx.Bool("auto") || len(sessions) == 1 {
							session := sessions[0]
							addr := session.Address()
							if addr == "" {
								addr = session.Host
							}
							serverAddr = fmt.Sprintf("ws://%s:%d", addr, session.Port)
							fmt.Printf("Connecting to: %s (%s)\n", session.Name, serverAddr)
						} else {
							// List sessions and let user choose
							fmt.Printf("\nFound %d session(s):\n\n", len(sessions))
							for i, session := range sessions {
								addr := session.Address()
								if addr == "" {
									addr = session.Host
								}
								fmt.Printf("%d. %s (%s:%d)\n", i+1, session.Name, addr, session.Port)
							}

							fmt.Print("\nSelect session (1-" + strconv.Itoa(len(sessions)) + "): ")
							var choice int
							_, err = fmt.Scanf("%d", &choice)
							if err != nil || choice < 1 || choice > len(sessions) {
								return fmt.Errorf("invalid selection")
							}

							session := sessions[choice-1]
							addr := session.Address()
							if addr == "" {
								addr = session.Host
							}
							serverAddr = fmt.Sprintf("ws://%s:%d", addr, session.Port)
							fmt.Printf("Connecting to: %s\n", session.Name)
						}
					}

					isHost := cCtx.Bool("host")
					ui.PokerClientMainView(isHost, username, serverAddr)
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
