# Planning Poker 🎴

Self-hosted planning poker with a Go backend and React frontend. Launch a session in seconds, invite your team, and estimate together without third-party services.

## Quick Start

1. Install the binary (`go install github.com/jcpsimmons/poker@latest` or grab a release).
2. Run `poker server`.
3. Visit http://localhost:9867, enter your name, and start a round.

## Install Options

- `go install github.com/jcpsimmons/poker@latest`
- Download a prebuilt release from https://github.com/jcpsimmons/poker/releases
- Build locally:
  ```
  git clone https://github.com/jcpsimmons/poker
  cd poker
  ./build.sh
  ```

## Run Locally

### Production-style

```
./build.sh     # builds web assets + Go binary
./poker server --port 9867
```

Open http://localhost:9867 (or your chosen port).

### Hot Reload Dev Loop

```
./dev-ui.sh
```

The script starts the Go server on 9867 and Vite on 5173 with HMR. Stop both with Ctrl+C.

<details>
<summary>Manual dev commands</summary>

```
./dev.sh              # Go server only
cd web && npm run dev # React dev server with HMR
```

Open http://localhost:5173 while the Go server runs in another terminal.
</details>

## CLI Cheatsheet

| Command | What it does |
| --- | --- |
| `poker server` | Serve the web UI + WebSocket on port 9867 (use `--port` to change). |
| `poker server --announce --name "team-planning"` | Broadcast the session over Tailscale/mDNS for one-click LAN discovery. |
| `poker server --linear-cycle <Linear cycle URL>` | Pull unestimated issues from Linear and post results back. |
| `poker server --ngrok` | Start the server and expose it with ngrok (requires `NGROK_AUTHTOKEN`). |
| `poker discover` | List LAN/Tailscale sessions advertising via mDNS. |

## Quick Play

- Players join via the web UI and click a card to vote (1, 2, 3, 5, 8, 13).
- Hosts reveal votes, discuss, and clear the board for the next round.
- Confetti triggers when votes land within two points of each other.

## Configuration & Extras

Default config file: `~/.config/poker/config.yaml`

<details>
<summary>Tailscale / LAN discovery</summary>

```
poker server --announce --name "planning-session"
```

Teammates on the same LAN or Tailscale network can run `poker discover` or just open `http://<your-hostname>:9867`.
</details>

<details>
<summary>Expose over ngrok</summary>

```
export NGROK_AUTHTOKEN=xxxxxxxx
./build.sh
poker server --ngrok
```

Share the printed public URL. Both the web UI and WebSocket use the same origin.
</details>

<details>
<summary>Linear integration</summary>

```
mkdir -p ~/.config/poker
cp config.example.yaml ~/.config/poker/config.yaml
# add your Linear API key to the file
poker server --linear-cycle https://linear.app/yourorg/team/TEAM/cycle/upcoming
```

Hosts get automatic issue suggestions and results are posted back to Linear as comments.
</details>

## License

MIT
