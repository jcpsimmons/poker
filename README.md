# Planning Poker App

A very simple planning poker app that uses websockets.

## Running in Deno

`deno run main.ts`

## Building to binary with Nix

`nix build '.#poker'`

## Running IRL

If on LAN - you can just expose ports 3333 (websocket server) and 3332 (static page webserver) then have players visit `YOUR_LAN_IP:3332`

You could also host on an EC2 and expose those ports, use ngrok to reverse proxy, etc etc...

## Security

There is NO SECURITY built into this app. The websocket sends the entire state object to ACK each websocket message from the client. Never post important information here as anyone could join if you host on the open web. For the `Issue Description` probably best to stick with a ticket number only.
