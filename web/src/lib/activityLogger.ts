/**
 * Activity Logger
 * Tracks tactical events for display in TacticalFeed component
 */

export type ActivityType =
  | "VOTE"
  | "REVEAL"
  | "RESET"
  | "CONNECT"
  | "DISCONNECT"
  | "ROUND_START"
  | "ISSUE_LOADED"
  | "QUEUE_UPDATED";

export interface ActivityEntry {
  id: string;
  timestamp: number;
  type: ActivityType;
  details: string;
  formatted: string;
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

export const logActivity = (
  type: ActivityType,
  details: string
): ActivityEntry => {
  const timestamp = Date.now();
  const formatted = `[${formatTime(timestamp)}] ${type}: ${details}`;
  
  return {
    id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    type,
    details,
    formatted,
  };
};

