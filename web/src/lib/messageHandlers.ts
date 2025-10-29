/**
 * Message Handler Registry
 * 
 * This file contains typed handler functions for each WebSocket message type.
 * Each handler receives the parsed payload and current game state, and returns
 * a partial state update that will be merged with the existing state.
 * 
 * Message Flow Documentation:
 * 
 * Server → Client Message Flow:
 * 1. Join → Server sends: currentIssue, participantCount, voteStatus, queueSync
 * 2. Estimate → Server broadcasts: voteStatus (who has voted)
 * 3. Reveal → Server broadcasts: revealData (all votes + average)
 * 4. Reset → Server broadcasts: clearBoard, then suggests next issue to hosts
 * 5. Queue operations → Server broadcasts: queueSync (full queue state)
 * 
 * Dependencies:
 * - revealData: Requires votes to exist (sent after votes are collected)
 * - issueLoaded: May depend on queueItems (if loaded from queue)
 * - currentIssue: Can be string OR object (backwards compatibility)
 * 
 * Edge Cases:
 * - currentIssue can be simple string ("Waiting for host...") or object with linearIssue
 * - voteStatus updates can arrive before revealData (votes are hidden until reveal)
 * - estimateAssignmentSuccess triggers auto-advance logic (timeout-based)
 */

import { toast } from "sonner";
import type {
  GameState,
  CurrentIssuePayload,
  RevealPayload,
  VoteStatusPayload,
  IssueSuggestedPayload,
  IssueLoadedPayload,
  QueueSyncPayload,
} from "../types/poker";
import { parsePayload } from "./messageParsers";
import {
  validateVoteStatus,
  validateRevealData,
  validateCurrentIssue,
  validateQueueSync,
} from "./messageValidators";

/**
 * Handler function type - receives payload and current state, returns partial state update
 */
export type MessageHandler = (
  payload: unknown,
  currentState: GameState,
  options?: {
    wsRef?: React.MutableRefObject<any>;
    gameStateRef?: React.MutableRefObject<GameState | null>;
  }
) => Partial<GameState> | null;

/**
 * Handle currentIssue message - can be string or object payload
 */
export const handleCurrentIssue: MessageHandler = (payload, currentState) => {
  const parsed = parsePayload<CurrentIssuePayload | string>(payload);

  if (typeof parsed === 'string') {
    // Simple string payload
    return {
      currentIssue: parsed,
      // Don't clear linearIssue for simple string payloads if we already have one
      revealed: false,
      votes: [],
      myVote: undefined,
      roundNumber: currentState.roundNumber + 1,
    };
  }

  // Object payload with optional linearIssue
  if (!validateCurrentIssue(parsed)) {
    console.warn('[MessageHandler] CurrentIssue validation failed, using fallback');
    return {
      currentIssue: typeof payload === 'string' ? payload : 'Unknown issue',
      revealed: false,
      votes: [],
      myVote: undefined,
      roundNumber: currentState.roundNumber + 1,
    };
  }

  return {
    currentIssue: parsed.text,
    linearIssue: parsed.linearIssue ?? currentState.linearIssue,
    revealed: false,
    votes: [],
    myVote: undefined,
    roundNumber: currentState.roundNumber + 1,
  };
};

/**
 * Handle participantCount message
 */
export const handleParticipantCount: MessageHandler = (payload) => {
  const count = typeof payload === 'string' ? parseInt(payload, 10) : payload;
  if (isNaN(count as number)) {
    console.warn('[MessageHandler] ParticipantCount: invalid count', payload);
    return null;
  }
  return { participants: count as number };
};

/**
 * Handle currentEstimate message (legacy, not used but kept for compatibility)
 */
export const handleCurrentEstimate: MessageHandler = () => {
  // Not used in current UI
  return null;
};

/**
 * Handle revealData message - shows all votes and average
 */
export const handleRevealData: MessageHandler = (payload) => {
  const parsed = parsePayload<RevealPayload>(payload);

  if (!validateRevealData(parsed)) {
    console.warn('[MessageHandler] RevealData validation failed');
    return null;
  }

  return {
    revealed: true,
    averagePoints: parsed.pointAvg,
    votes: parsed.estimates.map((est) => ({
      username: est.user,
      points: est.estimate,
      revealed: true,
    })),
  };
};

/**
 * Handle clearBoard message - resets votes for new round
 */
export const handleClearBoard: MessageHandler = () => {
  return {
    revealed: false,
    votes: [],
    myVote: undefined,
  };
};

/**
 * Handle issueSuggested message - suggests next Linear issue to hosts
 */
export const handleIssueSuggested: MessageHandler = (payload) => {
  const parsed = parsePayload<IssueSuggestedPayload>(payload);
  return {
    pendingIssue: parsed,
  };
};

/**
 * Handle issueLoaded message - confirms an issue was loaded
 */
export const handleIssueLoaded: MessageHandler = (payload, currentState) => {
  const parsed = parsePayload<IssueLoadedPayload>(payload);

  // Try to find Linear issue data from queue items
  let linearIssue = currentState.linearIssue;

  // Check if this is in the queue as a Linear item
  const queueItem = currentState.queueItems.find(
    (item) => item.identifier === parsed.identifier && item.source === 'linear'
  );

  if (queueItem && queueItem.linearId) {
    linearIssue = {
      id: queueItem.linearId,
      identifier: queueItem.identifier,
      title: queueItem.title,
      description: queueItem.description || '',
      url: queueItem.url || '',
    };
  } else if (
    currentState.pendingIssue &&
    currentState.pendingIssue.identifier === parsed.identifier &&
    currentState.pendingIssue.source === 'linear'
  ) {
    // Fallback to pendingIssue data
    linearIssue = {
      id: currentState.pendingIssue.identifier,
      identifier: currentState.pendingIssue.identifier,
      title: currentState.pendingIssue.title,
      description: currentState.pendingIssue.description || '',
      url: currentState.pendingIssue.url || '',
    };
  } else if (
    currentState.linearIssue &&
    currentState.linearIssue.identifier === parsed.identifier
  ) {
    // Keep existing linearIssue if it matches
    linearIssue = currentState.linearIssue;
  }

  return {
    currentIssue: parsed.title,
    currentIssueId: parsed.identifier,
    pendingIssue: undefined,
    linearIssue,
  };
};

/**
 * Handle issueStale message - queue changed, refresh needed
 */
export const handleIssueStale: MessageHandler = () => {
  console.warn('Issue queue changed, refresh needed');
  return null;
};

/**
 * Handle voteStatus message - updates who has voted
 */
export const handleVoteStatus: MessageHandler = (payload) => {
  const parsed = parsePayload<VoteStatusPayload>(payload);

  if (!validateVoteStatus(parsed)) {
    console.warn('[MessageHandler] VoteStatus validation failed');
    return null;
  }

  console.log('Vote status update:', parsed);

  const votes = parsed.voters
    .filter((voter) => voter.hasVoted)
    .map((voter) => ({
      username: voter.username,
      points: '', // Don't show points until reveal
      revealed: false,
    }));

  console.log(`Updating votes: ${votes.length} voted out of ${parsed.voters.length} total`);

  // Update both votes AND participants atomically to prevent flashing
  // voteStatus contains the complete voter list, so use it as source of truth
  return { 
    votes,
    voters: parsed.voters, // Store ALL participants
    participants: parsed.voters.length,
  };
};

/**
 * Handle joinError message
 */
export const handleJoinError: MessageHandler = (payload) => {
  // This will be handled by the connect function's error handler
  console.error('Join error from server:', payload);
  return null;
};

/**
 * Handle queueSync message - full queue state update
 */
export const handleQueueSync: MessageHandler = (payload) => {
  const parsed = parsePayload<QueueSyncPayload>(payload);

  if (!validateQueueSync(parsed)) {
    console.warn('[MessageHandler] QueueSync validation failed');
    return null;
  }

  return {
    queueItems: parsed.items || [],
  };
};

/**
 * Handle estimateAssignmentSuccess message - shows toast and triggers auto-advance
 */
export const handleEstimateAssignmentSuccess: MessageHandler = (
  payload,
  _currentState,
  options
) => {
  console.log('✅ estimateAssignmentSuccess received, starting auto-advance logic');
  const messageText =
    typeof payload === 'string' ? payload : 'Estimate assigned successfully';
  toast.success(messageText, {
    duration: 3000,
  });

  // Auto-advance to next issue in queue (if host and queue has items)
  // Wait a moment for state to update (queue sync after assignment), then advance
  // Server will broadcast autoAdvance message to everyone when issue loads
  setTimeout(() => {
    console.log('⏰ Auto-advance timeout fired, checking state...');
    // Use refs to get latest state and ws
    const currentStateRef = options?.gameStateRef?.current;
    const currentWs = options?.wsRef?.current;
    console.log('📊 Current state:', {
      isHost: currentStateRef?.isHost,
      hasWs: !!currentWs,
      queueLength: currentStateRef?.queueItems?.length,
      queueItems: currentStateRef?.queueItems?.map((i) => i.identifier),
    });

    if (currentStateRef && currentStateRef.isHost && currentWs) {
      // Get the first item from the queue (current issue should already be removed)
      if (currentStateRef.queueItems && currentStateRef.queueItems.length > 0) {
        const nextItem = currentStateRef.queueItems[0];
        console.log(
          '🚀 Auto-advancing to next issue:',
          nextItem.identifier,
          'isCustom:',
          nextItem.source === 'custom'
        );
        // Load the next issue (server will send autoAdvance notification to everyone)
        currentWs.sendIssueConfirm(nextItem.identifier, -1, nextItem.source === 'custom');
        console.log('✅ sendIssueConfirm called');
      } else {
        console.log('❌ Auto-advance skipped: queue is empty or queueItems is undefined');
      }
    } else {
      console.log('❌ Auto-advance skipped:', {
        hasState: !!currentStateRef,
        isHost: currentStateRef?.isHost,
        hasWs: !!currentWs,
      });
    }
  }, 2000); // Wait 2 seconds to ensure queue sync has updated the state

  return null; // No state update needed, handled via timeout
};

/**
 * Handle estimateAssignmentError message
 */
export const handleEstimateAssignmentError: MessageHandler = (payload) => {
  const messageText =
    typeof payload === 'string' ? payload : 'Failed to assign estimate';
  toast.error(messageText, {
    duration: 5000,
  });
  return null;
};

/**
 * Handle autoAdvance message
 */
export const handleAutoAdvance: MessageHandler = (payload) => {
  const messageText =
    typeof payload === 'string' ? payload : 'Advancing to next issue in queue...';
  toast.info(messageText, {
    duration: 2000,
  });
  return null;
};

/**
 * Message handler registry - maps message types to handler functions
 */
export const messageHandlers: Record<string, MessageHandler> = {
  currentIssue: handleCurrentIssue,
  participantCount: handleParticipantCount,
  currentEstimate: handleCurrentEstimate,
  revealData: handleRevealData,
  clearBoard: handleClearBoard,
  issueSuggested: handleIssueSuggested,
  issueLoaded: handleIssueLoaded,
  issueStale: handleIssueStale,
  voteStatus: handleVoteStatus,
  joinError: handleJoinError,
  queueSync: handleQueueSync,
  estimateAssignmentSuccess: handleEstimateAssignmentSuccess,
  estimateAssignmentError: handleEstimateAssignmentError,
  autoAdvance: handleAutoAdvance,
};

