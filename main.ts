import { LRU } from 'https://deno.land/x/lru@1.0.2/mod.ts';
import staticFiles from 'https://deno.land/x/static_files@1.1.6/mod.ts';

// serve static files from 'public' folder
const serveFiles = (req: Request) =>
  staticFiles('public')({
    request: req,
    respondWith: (r: Response) => r,
  });

console.log('Static file server listening on 3332');
Deno.serve({ port: 3332 }, (req) => serveFiles(req));

// websocket server definition

const state = {
  users: {} as {
    [key: string]: {
      name: string;
      vote: number | null;
      color: string;
      client: WebSocket;
    };
  },
  history: [] as { message: string; color: string }[],
  issue: '' as string,
  colorIndex: 0,
};

const COLORS = [
  '#d68aff',
  '#00ffff',
  '#ff8000',
  '#ffa6ff',
  '#ffff00',
  '#00ff00',
  '#0080ff',
  '#ffa399',
];

const cache = new LRU(100);

function logError(msg: string) {
  console.log(msg);
  Deno.exit(1);
}
function handleConnected(ws: WebSocket) {
  console.log('Connected to client ...');
  // send current state to newly connected client
  ws.send(JSON.stringify(state));
}
function handleMessage(ws: WebSocket, payload: string) {
  console.log('CLIENT >> ' + payload);

  const { topic, data } = JSON.parse(payload);

  switch (topic) {
    case 'join':
      state.users[data.name] = {
        name: data.name,
        vote: null,
        color: data.name.includes('josh')
          ? '#ff0073'
          : COLORS[state.colorIndex++ % COLORS.length],
        client: ws,
      };
      state.history.push({
        message: `${data.name} joined`,
        color: state.users[data.name].color,
      });
      break;
    case 'vote':
      console.log('state', state);
      state.users[data.name].vote = data.vote;
      state.history.push({
        message: `${data.name} voted ${data.vote} points on ${
          state.issue || 'current issue'
        }`,
        color: state.users[data.name].color,
      });
      break;
    case 'issue':
      state.issue = data;
      data
        ? state.history.push({ message: `New issue: ${data}`, color: '#fff' })
        : state.history.push({ message: `Issue cleared`, color: '#fff' });
      break;
    case 'reset':
      Object.keys(state.users).forEach((k) => (state.users[k].vote = null));
      break;
    case 'leave':
      delete state.users[data];
      state.history.push({
        message: `${data} left`,
        color: '#808080',
      });
      break;
    default:
      logError('Unknown topic: ' + topic);
  }
  // store in redis
  cache.set('state', JSON.stringify(state));

  // update state everywhere
  Object.keys(state.users).forEach((k) => {
    const user = state.users[k];
    user.client.send(JSON.stringify(state));
  });
}

function handleDisconnect(ws: WebSocket) {
  console.log('Disconnected from client ...');
  console.log('ws', ws);
}

function handleError(e: Event | ErrorEvent) {
  console.log(e instanceof ErrorEvent ? e.message : e.type);
}
// do i need async?
function reqHandler(req: Request) {
  if (req.headers.get('upgrade') != 'websocket') {
    return new Response(null, { status: 501 });
  }
  const { socket: ws, response } = Deno.upgradeWebSocket(req);
  ws.onopen = () => handleConnected(ws);
  ws.onmessage = (m) => handleMessage(ws, m.data);
  ws.onclose = () => handleDisconnect(ws);
  ws.onerror = (e) => handleError(e);
  return response;
}
console.log('Websocket listening on 3333');
Deno.serve({ port: 3333 }, reqHandler);

const cachedState = cache.get('state');
console.log('cachedState', cachedState);
if (cachedState) {
  Object.assign(state, cachedState);
}
