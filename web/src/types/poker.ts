// TypeScript types matching Go server types

export const MessageType = {
  Join: "join",
  Estimate: "estimate",
  Leave: "leave",
  Reveal: "reveal",
  Reset: "reset",
  NewIssue: "newIssue",
  // Server messages to client
  CurrentIssue: "currentIssue",
  ParticipantCount: "participantCount",
  RevealData: "revealData",
  CurrentEstimate: "currentEstimate",
  ClearBoard: "clearBoard",
  // Linear queue management
  IssueSuggested: "issueSuggested",
  IssueConfirm: "issueConfirm",
  IssueLoaded: "issueLoaded",
  IssueStale: "issueStale",
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];

export interface Message {
  type: MessageType;
  payload: string;
}

export interface JoinPayload {
  username: string;
  isHost: boolean;
}

export interface JoinMessage {
  type: typeof MessageType.Join;
  payload: JoinPayload;
}

export interface UserEstimate {
  user: string;
  estimate: string;
}

export interface RevealPayload {
  estimates: UserEstimate[];
  pointAvg: string;
}

export interface RevealMessage {
  type: typeof MessageType.RevealData;
  payload: RevealPayload;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string;
  url: string;
}

export interface CurrentIssuePayload {
  text: string;
  linearIssue?: LinearIssue;
}

export interface IssueSuggestedPayload {
  version: number;
  source: string; // "linear" | "custom" | "system"
  identifier: string;
  title: string;
  description?: string;
  url?: string;
  queueIndex: number;
  hasMore?: boolean;
}

export interface IssueConfirmPayload {
  requestId: string;
  identifier: string;
  queueIndex: number;
  isCustom: boolean;
}

export interface IssueLoadedPayload {
  identifier: string;
  title: string;
  queueIndex: number;
}

// Client-side state
export interface GameState {
  connected: boolean;
  username: string;
  isHost: boolean;
  currentIssue: string;
  currentIssueId: string;
  linearIssue?: LinearIssue;
  participants: number;
  votes: Vote[];
  revealed: boolean;
  myVote?: number;
  averagePoints: string;
  roundNumber: number;
  pendingIssue?: IssueSuggestedPayload;
}

export interface Vote {
  username: string;
  points: string;
  revealed: boolean;
}

export interface EstimateOption {
  points: number;
  label: string;
  description: string;
  icon: string;
}

export const ESTIMATE_OPTIONS: EstimateOption[] = [
  { points: 1, label: "1 point", description: "Tiny task", icon: "📝" },
  { points: 2, label: "2 points", description: "Part of a day", icon: "🌅" },
  { points: 3, label: "3 points", description: "Full day", icon: "☀️" },
  { points: 5, label: "5 points", description: "2-3 days", icon: "📅" },
  { points: 8, label: "8 points", description: "A week", icon: "📆" },
  { points: 13, label: "13 points", description: "Break it down!", icon: "💥" },
];

