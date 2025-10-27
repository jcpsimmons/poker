Planning

```
 _______    ______   __    __  ________  _______
/       \  /      \ /  |  /  |/        |/       \
$$$$$$$  |/$$$$$$  |$$ | /$$/ $$$$$$$$/ $$$$$$$  |
$$ |__$$ |$$ |  $$ |$$ |/$$/  $$ |__    $$ |__$$ |
$$    $$/ $$ |  $$ |$$  $$<   $$    |   $$    $$<
$$$$$$$/  $$ |  $$ |$$$$$  \  $$$$$/    $$$$$$$  |
$$ |      $$ \__$$ |$$ |$$  \ $$ |_____ $$ |  $$ |
$$ |      $$    $$/ $$ | $$  |$$       |$$ |  $$ |
$$/        $$$$$$/  $$/   $$/ $$$$$$$$/ $$/   $$/
```

_A TUI for estimating tickets with your team._

## Introduction

![The CLI app running in host mode displaying the host controls.](./readmePics/hostmode.png)

Free online planning poker tools pretty universally suck. `poker` aims to fix that through the elimination of unnecessary features.

- Zero configuration with Tailscale auto-discovery
- No external dependencies or infrastructure
- Works on LAN, Tailscale, or with ngrok
- One executable for both server and client

Just install one executable - it can run in either client or server mode. With Tailscale, zero configuration is needed: your team just connects and starts estimating.

## Installation

Two options.

1. Have `go` installed? Simply run `go install github.com/jcpsimmons/poker@latest`
2. No go? Pop over to the [releases page](https://github.com/jcpsimmons/poker/releases) and grab the latest. There are builds for every major system and arch.

## Use

The CLI can run in client or server mode. There are several ways to connect your team:

### Tailscale Auto-Discovery (Recommended)

If your team is on Tailscale (or on the same LAN), use auto-discovery for zero-configuration setup:

1. Start the server with announcement enabled: `poker server --announce --name "squad-alpha" --port 8080`
2. Host connects with auto-discovery: `poker client --host josh` (will auto-select if only one session)
3. Team members connect: `poker client alice` (select from discovered sessions)

Or discover sessions first: `poker discover` to see all available sessions on your network.

**Benefits:**
- No ngrok needed
- No URL sharing
- Works automatically across Tailscale/LAN
- Zero configuration

### Traditional Setup (ngrok or LAN)

For manual setup with ngrok or on a local network:

1. Install `ngrok` (optional - only needed for remote teams without Tailscale)
2. Start forwarding port `8080` via `ngrok` e.g. `ngrok http http://localhost:8080`
3. Fire up `poker` in server mode - `poker server --port 8080`
4. Connect to your instance as a client in host mode: `poker client --host josh wss://ngrok-gibberish.ngrok-free.app` (be certain you're using `wss` if using `ngrok`)
5. Share the URL with your team - to connect as a non-host client: `poker client alice wss://ngrok-gibberish.ngrok-free.app`

### Notes

- Use `ws://` protocol for local/LAN connections
- Use `wss://` protocol for ngrok or remote connections
- Default port is `8080`
- Tailscale integration requires no admin permissions

## Quick Commands

```bash
# Start a server with auto-discovery
poker server --announce --name "my-team"

# Discover available sessions
poker discover

# Connect to a session (auto-discovers if no URL provided)
poker client alice

# Connect as host with discovery
poker client --host josh

# Manual connection (traditional method)
poker client alice ws://192.168.1.100:8080
```

## Contributing

I welcome contributions - this is my first app written in Golang. There are currently no tests so that may be a good place to begin with contributions!
