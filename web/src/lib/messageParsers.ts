/**
 * Unified payload parser that handles both string and object payloads consistently.
 * The server may send payloads as JSON strings or parsed objects.
 */
export function parsePayload<T>(payload: unknown): T {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as T;
    } catch {
      // If parsing fails, treat the string itself as the payload
      return payload as unknown as T;
    }
  }
  // Payload is already an object
  return payload as T;
}

