# Poker Planning - React Web Client

Modern, beautiful web interface for poker planning built with React, TypeScript, and Tailwind CSS.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **React Confetti** - Celebration animations

## Color Palette

The UI uses a vibrant, playful color scheme:

- **Primary** (#FF6B9D) - Hot pink for main accents
- **Secondary** (#C084FC) - Purple for supporting elements
- **Accent** (#FFA500) - Orange for host tools
- **Success** (#4ADE80) - Green for positive actions
- **Warning** (#FBBF24) - Yellow for cautions
- **Danger** (#F87171) - Red for errors
- **Info** (#60A5FA) - Blue for information

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start dev server (port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development with Go Server

1. Start Go server in project root: `./dev.sh`
2. In separate terminal: `cd web && npm run dev`
3. Open http://localhost:5173
4. Server URL in app: `ws://localhost:9867/ws`

## Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── layout/       # Header, StatusBar
│   │   ├── modals/       # HelpModal, IssuePickerModal, StatsModal
│   │   ├── Confetti.tsx
│   │   ├── EstimateSelector.tsx
│   │   ├── HostControls.tsx
│   │   ├── IssueCard.tsx
│   │   └── VoteDisplay.tsx
│   ├── contexts/
│   │   └── PokerContext.tsx    # Global state management
│   ├── hooks/
│   ├── lib/
│   │   ├── utils.ts            # Helper functions
│   │   └── websocket.ts        # WebSocket client
│   ├── pages/
│   │   ├── GamePage.tsx        # Main game view
│   │   └── JoinPage.tsx        # Connection page
│   ├── types/
│   │   └── poker.ts            # TypeScript definitions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css               # Tailwind directives
├── public/
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Features

### For Everyone
- Click to vote on estimates (1, 2, 3, 5, 8, 13 points)
- See when teammates have voted (animated card backs)
- View revealed results with visual bar charts
- Help modal with complete instructions
- Responsive design works on mobile and desktop

### For Hosts
- Load Linear issues or enter custom issues
- Reveal votes to show results
- Clear board for new round
- View session statistics
- Manage game flow

### Special Features
- 🎉 Confetti animation on consensus (votes within 2 points)
- 🎴 Animated card backs for hidden votes
- 📊 Visual vote bars showing magnitude
- 🔗 Linear integration with clickable links
- ✨ Smooth transitions and hover effects
- 🎨 Beautiful gradient headers

## WebSocket Protocol

The client communicates with the Go server using WebSocket messages:

### Client → Server
- `join` - Join session with username and host mode
- `estimate` - Submit vote (points as string)
- `reveal` - Reveal round (host only)
- `reset` - Clear board (host only)
- `issueConfirm` - Confirm issue selection (host only)

### Server → Client
- `currentIssue` - New issue loaded
- `participantCount` - Number of participants
- `revealData` - All votes revealed
- `clearBoard` - Board cleared
- `issueSuggested` - Linear issue available
- `issueLoaded` - Issue successfully loaded

## Building for Production

The React app builds to `/web/dist` which is served by the Go server:

```bash
npm run build
```

The Go server then serves these static files and handles WebSocket on `/ws`.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Modern browsers with WebSocket support required.

## Contributing

When adding new features:

1. Update TypeScript types in `types/poker.ts`
2. Add WebSocket message handlers in `lib/websocket.ts`
3. Update context/state in `contexts/PokerContext.tsx`
4. Create/update UI components
5. Test with actual Go server

## License

Same as parent project
