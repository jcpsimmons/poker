package main

import (
	"fmt"
	"jsimmons/poker/server"
	"jsimmons/poker/ui"
	"log"
	"os"

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
				Action: func(cCtx *cli.Context) error {
					username := cCtx.Args().First()
					serverAddr := cCtx.Args().Get(1)
					if serverAddr == "" || username == "" {
						fmt.Println("Requires username and server address")
						log.Fatal("Usage: poker client <username> <server address>")
					} else {
						ui.PokerClientMainView(username, serverAddr)
					}
					return nil
				},
			},
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}
