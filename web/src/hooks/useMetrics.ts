/**
 * Metrics Hook
 * Tracks client-side metrics for defense-tech UI display
 */

import { useState, useEffect, useCallback } from "react";

export interface MetricsState {
  sessionStartTime: number | null;
  connectionStartTime: number | null;
  roundStartTime: number | null;
  lastActivityTime: number | null;
  totalMessages: number;
  reconnectCount: number;
  roundDurations: number[];
  messageTimestamps: number[]; // Track timestamps for throughput calculation
}

export interface ComputedMetrics {
  sessionUptime: string; // HH:MM:SS format
  connectionDuration: string; // HH:MM:SS format
  roundDuration: string; // HH:MM:SS format
  timeSinceLastActivity: string; // HH:MM:SS format
  messageThroughput: number; // messages per minute
  avgRoundTime: string; // Average round duration in HH:MM:SS
  consensusRate: number; // Percentage (0-100)
  connectionStability: string; // "STABLE" | "UNSTABLE" | "CRITICAL"
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const useMetrics = () => {
  const [metrics, setMetrics] = useState<MetricsState>({
    sessionStartTime: null,
    connectionStartTime: null,
    roundStartTime: null,
    lastActivityTime: null,
    totalMessages: 0,
    reconnectCount: 0,
    roundDurations: [],
    messageTimestamps: [],
  });

  // Initialize session start time when component mounts
  useEffect(() => {
    const savedSessionStart = localStorage.getItem("poker_session_start");
    if (savedSessionStart) {
      setMetrics((prev) => ({
        ...prev,
        sessionStartTime: parseInt(savedSessionStart, 10),
      }));
    } else {
      const now = Date.now();
      localStorage.setItem("poker_session_start", now.toString());
      setMetrics((prev) => ({
        ...prev,
        sessionStartTime: now,
      }));
    }
  }, []);

  // Update connection start time
  const startConnection = useCallback(() => {
    const now = Date.now();
    setMetrics((prev) => ({
      ...prev,
      connectionStartTime: prev.connectionStartTime || now,
      lastActivityTime: now,
    }));
  }, []);

  // Track reconnection
  const trackReconnect = useCallback(() => {
    setMetrics((prev) => ({
      ...prev,
      reconnectCount: prev.reconnectCount + 1,
      connectionStartTime: Date.now(),
    }));
  }, []);

  // Track message received
  const trackMessage = useCallback(() => {
    const now = Date.now();
    setMetrics((prev) => {
      const newTimestamps = [...prev.messageTimestamps, now].filter(
        (ts) => now - ts <= 60000
      ); // Keep only last 60 seconds
      return {
        ...prev,
        totalMessages: prev.totalMessages + 1,
        lastActivityTime: now,
        messageTimestamps: newTimestamps,
      };
    });
  }, []);

  // Start new round
  const startRound = useCallback(() => {
    const now = Date.now();
    setMetrics((prev) => {
      // If we had a previous round, calculate its duration
      if (prev.roundStartTime) {
        const duration = (now - prev.roundStartTime) / 1000; // seconds
        return {
          ...prev,
          roundStartTime: now,
          roundDurations: [...prev.roundDurations, duration],
        };
      }
      return {
        ...prev,
        roundStartTime: now,
      };
    });
  }, []);

  // Calculate consensus rate (requires votes data)
  const calculateConsensusRate = useCallback(
    (votes: Array<{ points: string }>, roundNumber: number): number => {
      if (roundNumber <= 1 || votes.length === 0) return 0;
      
      // Consensus is when votes are within 2 points of each other
      const points = votes
        .map((v) => parseInt(v.points, 10))
        .filter((p) => !isNaN(p) && p > 0);
      
      if (points.length < 2) return 0;
      
      const min = Math.min(...points);
      const max = Math.max(...points);
      const isConsensus = max - min <= 2;
      
      // Calculate based on completed rounds with consensus
      // We track this by checking if current round had consensus
      // For simplicity, we'll estimate based on round durations vs total rounds
      // This is approximate since we don't track consensus per round
      return isConsensus ? (metrics.roundDurations.length / roundNumber) * 100 : 0;
    },
    [metrics.roundDurations]
  );

  // Compute derived metrics
  const computeMetrics = useCallback(
    (votes: Array<{ points: string }>, roundNumber: number): ComputedMetrics => {
      const now = Date.now();

      // Calculate throughput (messages in last 60 seconds)
      const oneMinuteAgo = now - 60000;
      const recentMessages = metrics.messageTimestamps.filter(
        (ts) => ts >= oneMinuteAgo
      ).length;
      const messageThroughput = recentMessages;

      // Calculate times
      const sessionUptime = metrics.sessionStartTime
        ? formatTime((now - metrics.sessionStartTime) / 1000)
        : "00:00:00";

      const connectionDuration = metrics.connectionStartTime
        ? formatTime((now - metrics.connectionStartTime) / 1000)
        : "00:00:00";

      const roundDuration = metrics.roundStartTime
        ? formatTime((now - metrics.roundStartTime) / 1000)
        : "00:00:00";

      const timeSinceLastActivity = metrics.lastActivityTime
        ? formatTime((now - metrics.lastActivityTime) / 1000)
        : "00:00:00";

      // Average round time
      const avgRoundTime =
        metrics.roundDurations.length > 0
          ? formatTime(
              metrics.roundDurations.reduce((a, b) => a + b, 0) /
                metrics.roundDurations.length
            )
          : "00:00:00";

      // Consensus rate (simplified - based on current round consensus)
      const consensusRate = calculateConsensusRate(votes, roundNumber);

      // Connection stability
      let connectionStability: "STABLE" | "UNSTABLE" | "CRITICAL" = "STABLE";
      if (metrics.reconnectCount > 3) {
        connectionStability = "CRITICAL";
      } else if (metrics.reconnectCount > 0) {
        connectionStability = "UNSTABLE";
      }

      return {
        sessionUptime,
        connectionDuration,
        roundDuration,
        timeSinceLastActivity,
        messageThroughput,
        avgRoundTime,
        consensusRate,
        connectionStability,
      };
    },
    [metrics, calculateConsensusRate]
  );

  return {
    metrics,
    startConnection,
    trackReconnect,
    trackMessage,
    startRound,
    computeMetrics,
  };
};

