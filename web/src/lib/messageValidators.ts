import type {
  VoteStatusPayload,
  RevealPayload,
  CurrentIssuePayload,
  QueueSyncPayload,
} from "../types/poker";

/**
 * Runtime validators to ensure server payloads match expected shapes.
 * Logs warnings if payloads don't match expected structure.
 */

export function validateVoteStatus(payload: unknown): payload is VoteStatusPayload {
  if (!payload || typeof payload !== 'object') {
    console.warn('[MessageValidator] VoteStatus: payload is not an object', payload);
    return false;
  }

  const p = payload as Record<string, unknown>;
  if (!Array.isArray(p.voters)) {
    console.warn('[MessageValidator] VoteStatus: voters is not an array', payload);
    return false;
  }

  const voters = p.voters as unknown[];
  for (const voter of voters) {
    if (!voter || typeof voter !== 'object') {
      console.warn('[MessageValidator] VoteStatus: invalid voter object', voter);
      return false;
    }
    const v = voter as Record<string, unknown>;
    if (typeof v.username !== 'string' || typeof v.hasVoted !== 'boolean') {
      console.warn('[MessageValidator] VoteStatus: voter missing required fields', voter);
      return false;
    }
  }

  return true;
}

export function validateRevealData(payload: unknown): payload is RevealPayload {
  if (!payload || typeof payload !== 'object') {
    console.warn('[MessageValidator] RevealData: payload is not an object', payload);
    return false;
  }

  const p = payload as Record<string, unknown>;
  if (typeof p.pointAvg !== 'string') {
    console.warn('[MessageValidator] RevealData: pointAvg is not a string', payload);
    return false;
  }

  if (!Array.isArray(p.estimates)) {
    console.warn('[MessageValidator] RevealData: estimates is not an array', payload);
    return false;
  }

  const estimates = p.estimates as unknown[];
  for (const est of estimates) {
    if (!est || typeof est !== 'object') {
      console.warn('[MessageValidator] RevealData: invalid estimate object', est);
      return false;
    }
    const e = est as Record<string, unknown>;
    if (typeof e.user !== 'string' || typeof e.estimate !== 'string') {
      console.warn('[MessageValidator] RevealData: estimate missing required fields', est);
      return false;
    }
  }

  return true;
}

export function validateCurrentIssue(payload: unknown): payload is CurrentIssuePayload | string {
  // CurrentIssue can be a simple string OR an object
  if (typeof payload === 'string') {
    return true;
  }

  if (!payload || typeof payload !== 'object') {
    console.warn('[MessageValidator] CurrentIssue: payload is not an object or string', payload);
    return false;
  }

  const p = payload as Record<string, unknown>;
  if (typeof p.text !== 'string') {
    console.warn('[MessageValidator] CurrentIssue: text is not a string', payload);
    return false;
  }

  // linearIssue is optional, but if present should be an object
  if (p.linearIssue !== undefined && (typeof p.linearIssue !== 'object' || !p.linearIssue)) {
    console.warn('[MessageValidator] CurrentIssue: linearIssue is invalid', payload);
    return false;
  }

  return true;
}

export function validateQueueSync(payload: unknown): payload is QueueSyncPayload {
  if (!payload || typeof payload !== 'object') {
    console.warn('[MessageValidator] QueueSync: payload is not an object', payload);
    return false;
  }

  const p = payload as Record<string, unknown>;
  if (!Array.isArray(p.items)) {
    // items is optional, default to empty array
    return true;
  }

  return true;
}

