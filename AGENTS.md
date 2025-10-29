# AGENTS.MD - AI Agent Guide for Planning Poker App

## Project Overview

**Planning Poker** is a modern, self-hosted web application for agile estimation sessions. It combines a **Go backend** with a **React frontend** to provide real-time collaborative voting on story points.

### What This Application Does

- **Real-time Planning Poker**: Teams vote on story point estimates for issues/tickets
- **Host/Player Roles**: Hosts control rounds (reveal votes, clear board), players submit votes
- **Linear Integration**: Automatically pulls unestimated issues from Linear cycles and posts results back
- **Network Discovery**: Tailscale/mDNS auto-discovery for LAN sessions
- **WebSocket Communication**: Real-time bidirectional messaging between clients and server
- **Single Binary Deployment**: Go server serves both WebSocket and static React app

### Key Features

- 🎴 **Story Point Voting**: 1, 2, 3, 5, 8, 13 point system
- 🎯 **Consensus Detection**: Automatically detects when all votes match (with confetti!)
- 📊 **Vote Reveal**: Shows all votes + bar chart + average
- 🔄 **Round Management**: Clear board for new rounds
- 🎨 **Modern UI**: React + Tailwind CSS with animations
- 🌐 **Zero Config Networking**: Works on LAN, Tailscale, or via ngrok
- 📦 **Linear Integration**: Pull issues, post results automatically

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           React App (TypeScript + Vite)                │ │
│  │                                                        │ │
│  │  - Join Page (username, host mode)                    │ │
│  │  - Game Page (voting UI, controls)                    │ │
│  │  - PokerContext (global state)                        │ │
│  │  - WebSocket Client (reconnect logic)                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                    WebSocket (ws://)
                            │
┌─────────────────────────────────────────────────────────────┐
│                    GO SERVER (Port 9867)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  HTTP Server                                           │ │
│  │  - Serves static files from web/dist/                 │ │
│  │  - WebSocket endpoint at /ws                          │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Game State Manager                                    │ │
│  │  - Client connections (map[*Client]bool)              │ │
│  │  - Current issue tracking                             │ │
│  │  - Vote collection & averaging                        │ │
│  │  - Message routing & broadcasting                     │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Linear Integration (Optional)                         │ │
│  │  - GraphQL client                                      │ │
│  │  - Issue queue management                             │ │
│  │  - Auto-posting results                               │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Discovery System (mDNS)                               │ │
│  │  - Session announcement                               │ │
│  │  - Tailscale IP detection                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend (Go)

| Component | Library/Tool | Purpose |
|-----------|-------------|---------|
| **HTTP Server** | `net/http` | Serve static files + WebSocket |
| **WebSocket** | `gorilla/websocket` | Real-time bidirectional communication |
| **CLI** | `urfave/cli` | Command-line interface (`server`, `discover`) |
| **Linear API** | GraphQL | Fetch issues, post comments |
| **Discovery** | `hashicorp/mdns` | Tailscale/LAN session discovery |
| **Config** | YAML | User configuration (~/.config/poker/config.yaml) |

### Frontend (React)

| Component | Library/Tool | Purpose |
|-----------|-------------|---------|
| **Framework** | React 18 + TypeScript | Component-based UI |
| **Build Tool** | Vite | Fast dev server + production builds |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Icons** | Lucide React | Icon library |
| **Animations** | React Confetti | Celebration on consensus |
| **State** | React Context | Global game state management |
| **WebSocket** | Native WebSocket API | Server communication |

---

## File Structure

```
poker/
├── main.go                 # Entry point, CLI commands
├── server/
│   └── server.go          # WebSocket server, game logic
├── types/
│   └── types.go           # Shared Go types (messages, payloads)
├── messaging/
│   └── messaging.go       # Message marshalling/unmarshalling
├── linear/
│   └── linear.go          # Linear GraphQL client
├── discovery/
│   ├── announce.go        # mDNS session announcement
│   ├── browse.go          # Session discovery
│   └── ip.go              # Tailscale IP detection
├── config/
│   └── config.go          # Config file parsing
├── web/
│   ├── src/
│   │   ├── App.tsx                    # Root component
│   │   ├── main.tsx                   # Entry point
│   │   ├── contexts/
│   │   │   └── PokerContext.tsx       # Global state + WebSocket
│   │   ├── lib/
│   │   │   ├── websocket.ts           # WebSocket client class
│   │   │   └── utils.ts               # Utilities (cn, etc.)
│   │   ├── pages/
│   │   │   ├── JoinPage.tsx           # Username + host selection
│   │   │   └── GamePage.tsx           # Main game interface
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx         # Top bar
│   │   │   │   ├── StatusBar.tsx      # Participants count
│   │   │   │   └── Panel.tsx          # Container component
│   │   │   ├── modals/
│   │   │   │   ├── HelpModal.tsx      # Help/instructions
│   │   │   │   ├── IssuePickerModal.tsx  # Linear issue picker
│   │   │   │   └── StatsModal.tsx     # Session statistics
│   │   │   ├── EstimateSelector.tsx   # Vote buttons (1-13)
│   │   │   ├── HostControls.tsx       # Reveal, Clear, Next Issue
│   │   │   ├── IssueCard.tsx          # Current issue display
│   │   │   ├── VoteDisplay.tsx        # Vote results (bar chart)
│   │   │   ├── VoteStatus.tsx         # Who has voted indicator
│   │   │   └── Confetti.tsx           # Celebration animation
│   │   └── types/
│   │       └── poker.ts               # TypeScript types
│   ├── dist/                          # Built static files (served by Go)
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── build.sh                # Build script (React → Go)
├── dev.sh                  # Dev script (Go server only)
└── readme.md               # User documentation
```

---

## WebSocket Protocol

### Message Structure

All messages follow this JSON structure:

```json
{
  "type": "messageType",
  "payload": "string or JSON object"
}
```

### Client → Server Messages

| Type | Payload | Description |
|------|---------|-------------|
| `join` | `{ username: string, isHost: bool }` | Join session as player or host |
| `estimate` | `"1"` - `"13"` (string) | Submit vote |
| `reveal` | `""` | Host reveals all votes |
| `reset` | `""` | Host clears board for new round |
| `issueConfirm` | `{ requestId, identifier, queueIndex, isCustom }` | Host confirms loading an issue |

### Server → Client Messages

| Type | Payload | Description |
|------|---------|-------------|
| `currentIssue` | `string` or `{ text, linearIssue }` | New issue set |
| `participantCount` | `"5"` (string) | Number of connected participants |
| `currentEstimate` | `"3"` (string) | Average estimate (legacy, not used) |
| `revealData` | `{ pointAvg, estimates[] }` | All votes revealed |
| `clearBoard` | `""` | Board cleared, reset votes |
| `voteStatus` | `{ voters: [{ username, hasVoted }] }` | Who has voted (updates in real-time) |
| `issueSuggested` | `{ version, source, identifier, title, ... }` | Linear issue available |
| `issueLoaded` | `{ identifier, title, queueIndex }` | Issue successfully loaded |
| `issueStale` | `"..."` | Queue changed, refresh needed |

### Message Flow Examples

#### Joining a Session

```
Client → Server: { type: "join", payload: { username: "Alice", isHost: false } }
Server → Client: { type: "currentIssue", payload: "Waiting for host..." }
Server → Client: { type: "participantCount", payload: "3" }
Server → All:    { type: "participantCount", payload: "4" }
```

#### Voting Flow

```
Alice → Server: { type: "estimate", payload: "5" }
Server → All:   { type: "voteStatus", payload: { voters: [{ username: "Alice", hasVoted: true }, ...] } }

Bob → Server:   { type: "estimate", payload: "3" }
Server → All:   { type: "voteStatus", payload: { voters: [{ username: "Alice", hasVoted: true }, { username: "Bob", hasVoted: true }, ...] } }
```

#### Reveal Flow

```
Host → Server:  { type: "reveal", payload: "" }
Server → All:   { type: "revealData", payload: { 
                  pointAvg: "5",
                  estimates: [
                    { user: "Alice", estimate: "5" },
                    { user: "Bob", estimate: "3" },
                    { user: "Carol", estimate: "5" }
                  ]
                }}
```

#### Reset Flow

```
Host → Server:  { type: "reset", payload: "" }
Server:         [Posts results to Linear if applicable]
Server → All:   { type: "clearBoard", payload: "" }
Server → All:   { type: "voteStatus", payload: { voters: [{ username: "Alice", hasVoted: false }, ...] } }
Server → Hosts: { type: "issueSuggested", payload: { ... next Linear issue ... } }
```

---

## Key Components Deep Dive

### Backend: `server/server.go`

**Global State Variables:**
- `clients`: Map of all active WebSocket connections
- `currentIssue`: The issue being voted on
- `linearClient`: Linear API client (if integration enabled)
- `linearIssues`: Queue of unestimated issues from Linear
- `currentIssueIndex`: Index of current Linear issue
- `pendingQueueIndex`: Next issue ready to suggest

**Key Functions:**

```go
// Start the HTTP + WebSocket server
func Start(port string)

// Handle new WebSocket connections
func handler(w http.ResponseWriter, r *http.Request)

// Process incoming messages from client
func handleMessages(client *Client)

// Calculate rounded average from Fibonacci sequence
func getPointAverage() int64

// Broadcast message to all connected clients
func broadcast(message []byte, sender *Client)

// Send vote status update to all clients
func broadcastVoteStatus(client *Client)

// Reset all votes and clear board
func handleReset(client *Client)

// Post voting results to Linear issue as comment
func pushVotingResultsToLinear(sender *Client)

// Suggest next Linear issue to host(s)
func suggestIssueToHosts()

// Process host's confirmation to load an issue
func handleIssueConfirm(payload types.IssueConfirmPayload, sender *Client)
```

**Vote Averaging Algorithm:**
- Collects all non-zero estimates
- Calculates raw average
- Rounds to nearest Fibonacci value (1, 2, 3, 5, 8, 13)
- Ignores clients who didn't vote (estimate = 0)

### Frontend: `web/src/contexts/PokerContext.tsx`

**Responsibilities:**
- WebSocket connection management
- Global game state
- Auto-reconnect on disconnect
- Session persistence (localStorage)
- Message handling and state updates

**State Interface:**

```typescript
interface GameState {
  connected: boolean;
  username: string;
  isHost: boolean;
  currentIssue: string;
  currentIssueId: string;
  participants: number;
  votes: Vote[];
  revealed: boolean;
  averagePoints: string;
  roundNumber: number;
  myVote?: number;
  linearIssue?: LinearIssue;
  pendingIssue?: IssueSuggestedPayload;
}
```

**Context API:**

```typescript
interface PokerContextType {
  gameState: GameState;
  ws: PokerWebSocket | null;
  connect: (url, username, isHost) => Promise<void>;
  disconnect: () => void;
  leave: () => void;
  vote: (points: number) => void;
  reveal: () => void;
  clear: () => void;
  confirmIssue: (identifier, queueIndex, isCustom) => void;
}
```

### Frontend: `web/src/lib/websocket.ts`

**PokerWebSocket Class:**

```typescript
class PokerWebSocket {
  // Automatic reconnection with exponential backoff
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  
  // Message handlers (observer pattern)
  private messageHandlers: Set<MessageHandler>;
  private reconnectHandlers: Set<ReconnectHandler>;
  
  // Methods
  connect(): Promise<void>
  disconnect(): void
  onMessage(handler: MessageHandler)
  onReconnect(handler: ReconnectHandler)
  joinSession(username: string, isHost: boolean)
  sendEstimate(points: number)
  revealRound()
  resetBoard()
  sendIssueConfirm(...)
}
```

**Auto-Reconnect Flow:**
1. WebSocket closes unexpectedly (not code 1000)
2. Wait `reconnectDelay` ms
3. Attempt reconnection (up to 5 times)
4. On success, call all `reconnectHandlers`
5. Context re-joins session with saved username/isHost

### Frontend: `web/src/pages/GamePage.tsx`

**Layout Structure:**

```tsx
<GamePage>
  <Header />
  <Panel>
    <StatusBar participants={} />
    <IssueCard currentIssue={} />
    
    {!revealed && (
      <>
        <EstimateSelector onVote={} myVote={} />
        <VoteStatus votes={} />
      </>
    )}
    
    {revealed && (
      <VoteDisplay votes={} averagePoints={} />
    )}
    
    {isHost && (
      <HostControls 
        onReveal={} 
        onClear={} 
        onNextIssue={} 
      />
    )}
  </Panel>
  
  {/* Modals */}
  <HelpModal />
  <StatsModal />
  <IssuePickerModal />
  
  {/* Celebration */}
  <Confetti active={consensus} />
</GamePage>
```

---

## Linear Integration

### How It Works

1. **Server Startup:**
   ```bash
   poker server --linear-cycle https://linear.app/org/team/TEAM/cycle/upcoming
   ```

2. **Issue Fetching:**
   - Parses cycle URL to extract team ID and cycle identifier
   - Queries Linear GraphQL API for all issues in cycle
   - Filters to only unestimated issues (estimate = null)
   - Stores in `linearIssues` array

3. **Issue Queue Management:**
   - Server maintains `currentIssueIndex` (current) and `pendingQueueIndex` (next)
   - After reset, server suggests next issue to all hosts
   - Host clicks "Next Issue" → receives `issueSuggested` message
   - Host confirms → sends `issueConfirm` → server broadcasts `issueLoaded`

4. **Result Posting:**
   - On `reset` (clear board), if `currentLinearIssue` is set
   - Server calls `pushVotingResultsToLinear()`
   - Posts formatted comment to Linear issue:
     ```markdown
     ## Planning Poker Results
     
     - Alice: 5
     - Bob: 5
     - Carol: 3
     
     **Average:** 5 points
     ```

### Linear GraphQL Queries

**Fetch Cycle Issues:**
```graphql
query($teamId: String!, $cycleNumber: Float!) {
  team(id: $teamId) {
    cycles(filter: { number: { eq: $cycleNumber } }) {
      nodes {
        issues {
          nodes {
            id
            identifier
            title
            description
            url
            estimate
          }
        }
      }
    }
  }
}
```

**Post Comment:**
```graphql
mutation($issueId: String!, $body: String!) {
  commentCreate(input: { 
    issueId: $issueId, 
    body: $body 
  }) {
    success
    comment { id }
  }
}
```

---

## Development Workflow

### Starting Development

```bash
# Terminal 1: Start Go server (watches for changes in web/dist)
./dev.sh

# Terminal 2: Start React dev server (hot reload)
cd web
npm run dev
```

- React dev server: http://localhost:5173 (with HMR)
- WebSocket server: ws://localhost:9867/ws
- Vite proxies WebSocket requests to Go server

### Building for Production

```bash
# Build everything
./build.sh

# What it does:
# 1. cd web && npm run build  (React → web/dist/)
# 2. go build -o poker         (Go + embedded static files)
```

### Running Production Build

```bash
# Basic server
./poker server

# With Tailscale announcement
./poker server --announce --name "team-planning"

# With Linear integration
./poker server --linear-cycle https://linear.app/yourorg/team/TEAM/cycle/upcoming

# Custom port
./poker server --port 8080
```

### Discovering Sessions

```bash
./poker discover

# Output:
# Session Name      Address           Port
# -------------------------------------------------
# team-planning    100.64.1.5        9867
```

---

## State Management & Data Flow

### Client-Side State Flow

```
User Action (e.g., Vote)
    ↓
Component calls context method (e.g., vote(5))
    ↓
Context sends WebSocket message
    ↓
Context updates local state (optimistic update: myVote = 5)
    ↓
Server broadcasts voteStatus to all clients
    ↓
WebSocket onMessage handler receives voteStatus
    ↓
Context updates gameState (votes array from server)
    ↓
Components re-render with new state
```

### Server-Side State Flow

```
Client connects (WebSocket)
    ↓
Server adds to clients map
    ↓
Client sends "join" message
    ↓
Server sets client.UserID, client.IsHost
    ↓
Server broadcasts participantCount
    ↓
Client sends "estimate" message
    ↓
Server sets client.CurrentEstimate
    ↓
Server broadcasts voteStatus (who has voted)
    ↓
Host sends "reveal" message
    ↓
Server calculates average, formats estimates
    ↓
Server broadcasts revealData
    ↓
Host sends "reset" message
    ↓
Server posts to Linear (if applicable)
    ↓
Server resets all client.CurrentEstimate to 0
    ↓
Server broadcasts clearBoard
    ↓
Server suggests next Linear issue to hosts
```

---

## Key Concepts for LLM Agents

### 1. **Single-Page Application Flow**

- **JoinPage**: User enters username, selects host mode → saves to localStorage → calls `connect()`
- **GamePage**: Main interface, conditionally renders based on `gameState.revealed` and `gameState.isHost`
- No routing library (just conditional rendering based on `joined` state in App.tsx)

### 2. **Host vs. Player Distinction**

- **Server-side**: Tracks `client.IsHost` boolean
- **Client-side**: Stores in context (`gameState.isHost`)
- **UI Impact**: 
  - Hosts see "Reveal", "Clear", "Next Issue" buttons
  - Hosts receive `issueSuggested` messages
  - Players only see vote buttons and results

### 3. **Vote Status System**

- **Old behavior**: Server broadcast each individual vote
- **Current behavior**: Server broadcasts aggregated `voteStatus` with all voters and hasVoted flags
- **Client display**: Shows card icon for users who voted (but not their vote until reveal)
- **Logic**: `client.CurrentEstimate > 0` means has voted

### 4. **Consensus Detection**

- **Client-side logic** in GamePage.tsx
- **Condition**: `revealed && allVotesMatch && participants >= 2`
- **Effect**: Confetti animation triggers
- **Implementation**:
  ```typescript
  const allVotesMatch = votes.every(v => v.points === votes[0].points);
  const consensus = revealed && allVotesMatch && votes.length >= 2;
  ```

### 5. **Issue Queue Versioning**

- **Problem**: Race condition if multiple hosts click "Next Issue"
- **Solution**: 
  - Server maintains `pendingQueueIndex`
  - `issueSuggested` includes `queueIndex`
  - `issueConfirm` must match `pendingQueueIndex`
  - Mismatched confirmation → send `issueStale` + re-suggest

### 6. **Session Persistence**

- **localStorage keys:**
  - `poker_active_session`: "true" if session active
  - `poker_username`: Saved username
  - `poker_server_url`: WebSocket URL
  - `poker_is_host`: "true" if host
- **Auto-reconnect**: On app mount, if `poker_active_session` is true, attempt to reconnect
- **Leave action**: Clear all localStorage keys

### 7. **Vote Averaging Algorithm**

```go
possibleEstimates := []int64{1, 2, 3, 5, 8, 13}

// Calculate raw average (excluding 0s)
rawAvg := total / clientsWhoVoted

// Find closest Fibonacci value
for each possibleEstimate {
  calculate |possibleEstimate - rawAvg|
}
return possibleEstimate with minimum difference
```

Example: Votes are [3, 5, 5] → raw avg = 4.33 → closest is 5

### 8. **Message Payload Formats**

- **Simple string**: `{ type: "currentIssue", payload: "Issue text" }`
- **JSON object**: `{ type: "revealData", payload: { pointAvg: "5", estimates: [...] } }`
- **Hybrid**: `currentIssue` can be string OR `{ text, linearIssue }`
- **Parsing**: TypeScript checks `typeof payload === 'string'` then parses if needed

---

## Common Tasks & How-To

### Adding a New Message Type

1. **Define in `types/types.go`:**
   ```go
   const NewMessageType MessageType = "newMessageType"
   ```

2. **Create payload struct if needed:**
   ```go
   type NewMessagePayload struct {
     Field1 string `json:"field1"`
     Field2 int    `json:"field2"`
   }
   ```

3. **Handle in `server/server.go`:**
   ```go
   case types.NewMessageType:
     var payload types.NewMessagePayload
     json.Unmarshal(message, &payload)
     // ... handle logic ...
     broadcast(responseMessage, client)
   ```

4. **Add to TypeScript types (`web/src/types/poker.ts`):**
   ```typescript
   export const MessageType = {
     NewMessageType: "newMessageType" as const,
     // ...
   };
   
   export interface NewMessagePayload {
     field1: string;
     field2: number;
   }
   ```

5. **Handle in `PokerContext.tsx`:**
   ```typescript
   case "newMessageType": {
     const payload: NewMessagePayload = typeof message.payload === 'string'
       ? JSON.parse(message.payload)
       : message.payload;
     setGameState(prev => ({ ...prev, /* update */ }));
     break;
   }
   ```

6. **Send from WebSocket class (`websocket.ts`):**
   ```typescript
   sendNewMessage(field1: string, field2: number) {
     this.send({
       type: MessageType.NewMessageType,
       payload: { field1, field2 }
     });
   }
   ```

### Adding a New Component

1. Create in `web/src/components/`:
   ```tsx
   export const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
     return (
       <div className="flex flex-col gap-4">
         {/* Use Tailwind classes */}
       </div>
     );
   };
   ```

2. Import and use in GamePage or other components
3. Access global state via `usePoker()` hook if needed
4. Follow existing patterns for styling (Tailwind utility classes)

### Modifying the UI Theme

**Primary colors are in:**
- `web/src/index.css` (CSS custom properties)
- `web/tailwind.config.js` (Tailwind color palette)

**Current palette:**
- Primary: `#FF6B9D` (hot pink)
- Secondary: `#C084FC` (purple)
- Accent: `#FFA500` (orange)
- Success: `#4ADE80` (green)

**Change colors:**
```css
/* web/src/index.css */
:root {
  --color-primary: #FF6B9D;
  --color-secondary: #C084FC;
  /* ... */
}
```

### Adding Server-Side Features

**Example: Add a "Skip Vote" option**

1. **Backend** (`server/server.go`):
   ```go
   case types.SkipVote:
     client.CurrentEstimate = -1 // Use -1 for "skipped"
     broadcastVoteStatus(client)
   ```

2. **Frontend** (`websocket.ts`):
   ```typescript
   sendSkipVote() {
     this.send({ type: MessageType.SkipVote, payload: "" });
   }
   ```

3. **Context** (`PokerContext.tsx`):
   ```typescript
   const skip = useCallback(() => {
     if (ws) {
       ws.sendSkipVote();
       setGameState(prev => ({ ...prev, myVote: -1 }));
     }
   }, [ws]);
   ```

4. **UI** (`EstimateSelector.tsx`):
   ```tsx
   <button onClick={() => onSkip()}>Skip Vote</button>
   ```

---

## Testing & Debugging

### Manual Testing Checklist

- [ ] Join as player
- [ ] Join as host
- [ ] Vote submission (all point values)
- [ ] Vote status updates (see who voted)
- [ ] Reveal votes
- [ ] Vote averaging calculation
- [ ] Clear board
- [ ] Consensus detection (all vote same) → confetti
- [ ] Linear issue loading (if integrated)
- [ ] WebSocket reconnection (kill server, restart)
- [ ] Multiple simultaneous sessions
- [ ] Multiple tabs (same browser)
- [ ] Mobile responsive design

### Debugging Tips

**Backend Logs:**
```bash
./poker server
# Logs show:
# - New connections
# - Message received/sent
# - Vote status updates
# - Issue loading
# - Linear API calls
```

**Frontend Console:**
```javascript
// Check WebSocket connection
console.log(gameState.connected);

// Check current state
console.log(gameState);

// Check votes
console.log(gameState.votes);
```

**Common Issues:**

1. **WebSocket connection fails**: Check port, firewall, CORS
2. **Votes not updating**: Check `broadcastVoteStatus()` is called after estimate
3. **Confetti not showing**: Check `revealed && allVotesMatch` logic
4. **Linear integration broken**: Check API key, cycle URL format
5. **Build fails**: Run `cd web && npm install && npm run build`

---

## Extending the Application

### Ideas for New Features

1. **Vote History**: Track all rounds and results in a log
2. **Timer**: Add countdown timer for voting rounds
3. **Sound Effects**: Audio feedback on votes/reveals
4. **Dark Mode**: Toggle between light/dark themes
5. **Spectator Mode**: Join session without voting
6. **Vote Comments**: Allow users to explain their votes
7. **Export Results**: Download session results as CSV/JSON
8. **GitHub Integration**: Pull issues from GitHub Projects
9. **Jira Integration**: Pull issues from Jira
10. **Mobile App**: React Native version
11. **PWA Support**: Progressive Web App for offline support
12. **User Avatars**: Add profile pictures
13. **Emoji Reactions**: React to revealed votes
14. **Multiple Rounds**: Track multiple rounds per issue
15. **Vote Lock**: Prevent vote changes after submission

### Architecture Extension Points

- **New Integrations**: Follow `linear/linear.go` pattern for other APIs
- **Authentication**: Add JWT/OAuth before `handleMessages()`
- **Persistence**: Add database layer (SQLite/Postgres) to store sessions
- **Analytics**: Track voting patterns, consensus rate, etc.
- **Multi-room**: Support multiple simultaneous rooms (keyed by room ID)

---

## Important Notes for AI Agents

### DO's ✅

- **Follow existing patterns**: Look at similar components/functions for consistency
- **Use TypeScript types**: Define interfaces for all data structures
- **Test WebSocket messages**: Ensure client/server message formats match exactly
- **Preserve state flow**: Maintain unidirectional data flow (action → WebSocket → server → broadcast → state update)
- **Handle edge cases**: Empty votes, disconnections, race conditions
- **Update both sides**: Backend + frontend for any protocol changes
- **Use Tailwind**: All styling should use Tailwind utility classes
- **Early returns**: Use guard clauses for cleaner code

### DON'Ts ❌

- **Don't break WebSocket protocol**: Changing message formats requires coordinated backend + frontend changes
- **Don't add CSS files**: Use Tailwind classes instead
- **Don't use external state libraries**: The app uses React Context, keep it simple
- **Don't hardcode URLs**: Use environment variables or config
- **Don't remove backwards compatibility**: Old clients might still connect
- **Don't forget concurrency**: Use `mutex.Lock()` when accessing shared Go state
- **Don't skip error handling**: Always handle WebSocket errors, JSON parsing errors, etc.

### Code Style Preferences

**Go:**
- Use `fmt.Printf` for formatted output
- Use `log.Println` for server logs
- Prefer `strconv` over `fmt.Sprintf` for number→string
- Use defer for cleanup (`defer conn.Close()`)

**TypeScript/React:**
- Use `const` for function components: `const MyComponent: React.FC<Props> = () => {}`
- Event handlers prefixed with `handle`: `handleClick`, `handleKeyDown`
- Use early returns for cleaner conditionals
- Prefer `className` over ternary when possible: `className={cn("base", condition && "extra")}`
- Destructure props: `const { username, isHost } = gameState;`

**Naming Conventions:**
- Go: PascalCase for exported, camelCase for private
- TypeScript: camelCase for variables/functions, PascalCase for components/types
- Files: PascalCase for components (Header.tsx), camelCase for utilities (websocket.ts)

---

## Quick Reference

### Environment Variables / Config

```yaml
# ~/.config/poker/config.yaml
linear:
  api_key: "lin_api_xxxxx"
```

### CLI Commands

```bash
# Start server
poker server [--port 9867] [--announce] [--name "session"] [--linear-cycle URL]

# Discover sessions
poker discover
```

### Build Commands

```bash
# Dev
./dev.sh                 # Go server
cd web && npm run dev    # React dev server

# Production
./build.sh               # Build everything
```

### Default Values

- **Port**: 9867
- **WebSocket endpoint**: `/ws`
- **Static files**: Served from `web/dist/`
- **Point values**: 1, 2, 3, 5, 8, 13
- **Reconnect attempts**: 5
- **Reconnect delay**: 2000ms

### Key Directories

- `server/` - Go server code
- `web/src/` - React app code
- `web/dist/` - Built React app (served by Go)
- `types/` - Shared Go types
- `linear/` - Linear integration
- `discovery/` - Network discovery

---

## Useful Code Snippets

### Access Game State in Component

```typescript
import { usePoker } from "../contexts/PokerContext";

const MyComponent = () => {
  const { gameState, vote, reveal } = usePoker();
  
  return (
    <div>
      <p>Username: {gameState.username}</p>
      <button onClick={() => vote(5)}>Vote 5</button>
    </div>
  );
};
```

### Send Custom WebSocket Message

```typescript
// In PokerContext
const sendCustomMessage = useCallback((data: string) => {
  if (ws) {
    ws.send({ type: "customType", payload: data });
  }
}, [ws]);
```

### Broadcast to All Clients (Go)

```go
message := types.Message{
  Type:    types.CustomType,
  Payload: "data",
}
byteMessage := messaging.MarshallMessage(message)
broadcast(byteMessage, sender)
```

### Add New Vote Point Value

1. Update `EstimateSelector.tsx`:
   ```tsx
   const points = [1, 2, 3, 5, 8, 13, 21]; // Add 21
   ```

2. Update `server/server.go`:
   ```go
   possibleEstimates := []int64{1, 2, 3, 5, 8, 13, 21}
   ```

---

## Summary

This is a **real-time collaborative planning poker application** with:

- **Go backend**: WebSocket server, game state management, Linear integration
- **React frontend**: Modern UI, WebSocket client, auto-reconnect
- **Simple architecture**: Single binary, no database, ephemeral sessions
- **Great UX**: Confetti celebrations, smooth animations, mobile-friendly

The codebase is well-structured, uses modern tools, and follows best practices. The WebSocket protocol is the heart of the system—all real-time features flow through it.

**For AI agents**: This is a straightforward full-stack application. The backend is a stateful WebSocket server with in-memory game state. The frontend is a React SPA with global state managed via Context. When modifying, always consider both the client and server sides of the protocol.

---

Happy coding! 🎴✨

