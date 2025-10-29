# Planning Poker 🎴

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

_A modern web app for estimating tickets with your team._

## Introduction

Free online planning poker tools pretty universally suck. `poker` aims to fix that through simplicity and great UX.

### Key Features

- 🌐 **Beautiful Web UI** - Modern React interface with vibrant colors
- 🎯 **Zero Configuration** - Works with Tailscale auto-discovery
- 🔒 **No External Dependencies** - Self-hosted, private
- 🌍 **Works Anywhere** - LAN, Tailscale, or with ngrok
- 📦 **Single Binary** - Server serves both WebSocket and web app
- 🎨 **Linear Integration** - Pull issues, estimate, results auto-posted

### What's New in 2.0

**Complete Web UI Rewrite!** 

- Moved from Go CLI to beautiful React web interface
- Click-based voting (no terminal needed!)
- Real-time updates with smooth animations
- Confetti celebrations on consensus 🎉
- Mobile-friendly responsive design
- Same powerful server, better UX

## Installation

### Option 1: Go Install
```bash
go install github.com/jcpsimmons/poker@latest
```

### Option 2: Download Binary
Grab the latest from the [releases page](https://github.com/jcpsimmons/poker/releases) for your platform.

### Option 3: Build from Source
```bash
git clone https://github.com/jcpsimmons/poker
cd poker
./build.sh
```

## Quick Start

### 1. Start the Server

```bash
# Basic server
poker server

# With Tailscale auto-discovery
poker server --announce --name "squad-alpha"

# With Linear integration
poker server --linear-cycle https://linear.app/yourorg/team/TEAM/cycle/upcoming

# With ngrok (one command, share the printed URL)
export NGROK_AUTHTOKEN=your_token_here
poker server --ngrok
```

Server starts on port **9867** by default.

### 2. Open in Browser

Navigate to: **http://localhost:9867**

### 3. Join the Session

1. Enter your username
2. Check "Host Mode" if you're facilitating
3. Connect!

## Usage Modes

### Tailscale Auto-Discovery (Recommended)

If your team is on Tailscale or the same LAN:

```bash
# Host starts server with announcement
poker server --announce --name "planning-session"

# Team opens: http://<tailscale-hostname>:9867
# No ngrok, no URL sharing needed!
```

**Benefits:**
- Zero configuration
- Works across Tailscale network
- No external services
- Automatic discovery

### Expose via ngrok (One Command)

If Tailscale isn't an option, you can expose the app securely over the internet using ngrok embedded in the server:

```bash
# 1) Build production bundle (serves web/dist)
./build.sh

# 2) Set your ngrok auth token (once per machine)
export NGROK_AUTHTOKEN=your_token_here

# 3) Start server with ngrok
poker server --ngrok

# Output includes the public URL to share with your team, e.g.:
# Public URL: https://abc123.ngrok-free.app
# WebSocket endpoint: wss://abc123.ngrok-free.app/ws
```

Notes:
- The URL changes each run (no reserved subdomain required).
- Both the web app and WebSocket endpoint are served on the same origin.
- You can still use the classic ngrok CLI if preferred.

### Linear Integration

Seamlessly integrate with Linear for issue management:

1. Get Linear API key from your account settings

2. Create config file: `~/.config/poker/config.yaml`
   ```yaml
   linear:
     api_key: "lin_api_your_key_here"
   ```

3. Start server with Linear cycle:
   ```bash
   poker server --linear-cycle https://linear.app/yourorg/team/TEAM/cycle/upcoming
   ```

4. Server fetches all unestimated issues

5. Host clicks "Next Issue" to load Linear issues automatically

6. After voting, results are posted to Linear as comments

**Benefits:**
- No manual copy-paste
- Automatic comment posting with vote breakdown
- Filter unestimated issues
- Full issue descriptions in-app

## Discovery Command

Find active poker sessions on your network:

```bash
poker discover
```

Returns:
```
Found 2 session(s):

Session Name      Address           Port
-------------------------------------------------
squad-alpha      100.64.1.5        9867
backend-team     100.64.1.12       9867
```

## How to Play

### For Everyone

1. **Join**: Open the web app and enter your username
2. **Vote**: Click your estimate (1, 2, 3, 5, 8, 13 points)
3. **Wait**: See when teammates vote (card icon shows)
4. **See Results**: Host reveals votes with bar charts

### For Hosts

1. **Load Issue**: Click "Next Issue"
   - Use Linear integration for auto-loading
   - Or enter custom issue text
2. **Reveal**: Click "Reveal" to show everyone's votes
3. **Discuss**: Team discusses differences
4. **Clear**: Click "Clear" to vote again if needed
5. **Next**: Move to next issue

### Estimate Guide

- **📝 1 point** - Tiny task (to-do list item)
- **🌅 2 points** - Part of a day
- **☀️ 3 points** - Full day of work  
- **📅 5 points** - 2-3 days plus communication
- **📆 8 points** - About a week
- **💥 13 points** - Too big! Break it down

## Development

### Running in Dev Mode

```bash
# Terminal 1: Start Go server
./dev.sh

# Terminal 2: Start React dev server
cd web
npm run dev
```

React dev server runs on http://localhost:5173 with hot reload.

### Building

```bash
# Build everything (React + Go)
./build.sh

# Or manually:
cd web && npm run build && cd ..
go build -o poker
```

### Tech Stack

**Server:**
- Go 1.24
- Gorilla WebSocket
- Linear GraphQL API
- mDNS (Tailscale discovery)

**Client:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Lucide Icons
- React Confetti

See `web/README.md` for frontend details.

## Configuration

Default config location: `~/.config/poker/config.yaml`

```yaml
linear:
  api_key: "lin_api_your_key_here"
```

## CLI Commands

```bash
# Start server
poker server [--port 9867] [--announce] [--name "session"] [--linear-cycle URL] [--ngrok]

# Discover sessions
poker discover
```

## Notes

- Default port: **9867**
- WebSocket endpoint: `/ws`
- Web app served on `/`
- Supports multiple simultaneous sessions
- No data persistence (sessions are ephemeral)
- Linear results posted as issue comments

## Browser Requirements

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- WebSocket support required

## Screenshots

[Screenshot coming soon]

## Contributing

Contributions welcome! This is a learning project.

Areas for contribution:
- Tests (currently none!)
- Additional integrations (Jira, GitHub Issues)
- UI improvements
- Mobile app version

## License

MIT

## Credits

Built with:
- [Gorilla WebSocket](https://github.com/gorilla/websocket)
- [Bubble Tea](https://github.com/charmbracelet/bubbletea) (legacy CLI)
- [Tailwind CSS](https://tailwindcss.com/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)

Inspired by the need for a simple, beautiful, self-hosted planning poker tool.

---

**Happy estimating! 🎴✨**
