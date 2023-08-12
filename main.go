package main

import (
	"fmt"
	"log"
	"os"
	"sort"

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
				Action: func(cCtx *cli.Context) error {
					portArg := cCtx.Args().First()
					if portArg == "" {
						portArg = "8080"
					}
					server.Start(portArg)
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
				},
				Action: func(cCtx *cli.Context) error {
					username := cCtx.Args().First()
					serverAddr := cCtx.Args().Get(1)
					if serverAddr == "" || username == "" {
						fmt.Println("Requires username and server address")
						log.Fatal("Usage: poker client <username> <server address> <-h for host mode>")
					} else {
						isHost := cCtx.Bool("host")
						ui.PokerClientMainView(isHost, username, serverAddr)
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
