# Message Protocols Documentation

This document details the communication protocols between the React webview client and the Devvit backend, including message types, flow patterns, and error handling.

## Overview

Debate Dueler uses a typed message-passing system for client-server communication:

- **Client → Devvit**: WebView to Blocks messages
- **Devvit → Client**: Blocks to WebView messages
- **Type Safety**: All messages are strongly typed with TypeScript
- **Asynchronous**: All communications are async with proper error handling

## Message Architecture

### Base Message Structure

All messages follow a consistent structure with type discrimination:

```typescript
// Client to Devvit
type WebviewToBlockMessage = {
  type: MessageType;
  payload?: any; // Type varies by message type
};

// Devvit to Client
type BlocksToWebviewMessage = {
  type: MessageType;
  payload: any; // Structured response data
};
```

### System Message Wrapper

Devvit wraps all messages in a system envelope:

```typescript
type DevvitSystemMessage = {
  data: { message: BlocksToWebviewMessage };
  type?: 'devvit-message' | string;
};
```

## Client → Devvit Messages

### INIT
**Purpose**: Request initial game data when webview loads

**Message Structure**:
```typescript
{
  type: "INIT"
}
```

**Response**: `INIT_RESPONSE` with complete game state

**Usage**:
- Sent automatically when webview first loads
- Triggers deck loading and player session retrieval
- Includes admin status verification

### COMPLETE_GAME
**Purpose**: Submit final game results for validation and leaderboard update

**Message Structure**:
```typescript
{
  type: "COMPLETE_GAME";
  payload: {
    answers: PlayerAnswer[];
    totalScore: number;
    sessionData: PlayerSession;
  }
}
```

**Response**: `CONFIRM_SAVE_PLAYER_DATA`

**Processing**:
1. Server recalculates scores using authoritative data
2. Updates community statistics
3. Saves validated player session
4. Updates leaderboard rankings

### ADD_QUESTION
**Purpose**: Submit a new community-created question

**Message Structure**:
```typescript
{
  type: "ADD_QUESTION";
  payload: {
    question: Question;
  }
}
```

**Response**: `GIVE_POST_DATA` with updated deck

**Validation**:
- User authentication required
- Question content validation
- Rate limiting applied
- Author attribution added

### EDIT_QUESTION
**Purpose**: Modify an existing question (admin only)

**Message Structure**:
```typescript
{
  type: "EDIT_QUESTION";
  payload: {
    question: Question;
  }
}
```

**Response**: `GIVE_POST_DATA` with updated deck

**Permissions**: Requires moderator status

### DELETE_QUESTION
**Purpose**: Remove a question from the deck (admin only)

**Message Structure**:
```typescript
{
  type: "DELETE_QUESTION";
  payload: {
    questionId: string;
  }
}
```

**Response**: `GIVE_POST_DATA` with updated deck

**Permissions**: Requires moderator status

### GET_LEADERBOARD_DATA
**Purpose**: Request current leaderboard rankings

**Message Structure**:
```typescript
{
  type: "GET_LEADERBOARD_DATA"
}
```

**Response**: `GIVE_LEADERBOARD_DATA` with rankings

### GET_POST_DATA
**Purpose**: Refresh game data (deck, session, admin status)

**Message Structure**:
```typescript
{
  type: "GET_POST_DATA"
}
```

**Response**: `GIVE_POST_DATA` with current state

**Usage**:
- Called after admin operations
- Used for data synchronization
- Refreshes after question modifications

## Devvit → Client Messages

### INIT_RESPONSE
**Purpose**: Provide initial game data to webview

**Message Structure**:
```typescript
{
  type: "INIT_RESPONSE";
  payload: {
    postId: string;
    deck: Deck;
    playerSession: PlayerSession | null;
    userId: string;
    username: string;
    playerRank: number | null;
    isAdmin: boolean;
  }
}
```

**Triggers**: Response to `INIT` message

**Data Included**:
- Complete deck with questions and statistics
- Existing player session (if resuming)
- User identification and permissions
- Current leaderboard position

### CONFIRM_SAVE_PLAYER_DATA
**Purpose**: Confirm successful game completion and saving

**Message Structure**:
```typescript
{
  type: "CONFIRM_SAVE_PLAYER_DATA";
  payload: {
    isSaved: boolean;
  }
}
```

**Triggers**: Response to `COMPLETE_GAME`

**Usage**: Client updates UI to show completion status

### GIVE_LEADERBOARD_DATA
**Purpose**: Provide current leaderboard rankings

**Message Structure**:
```typescript
{
  type: "GIVE_LEADERBOARD_DATA";
  payload: {
    leaderboard: LeaderboardEntry[];
    playerRank: number | null;
    playerScore: number | null;
  }
}
```

**Triggers**: Response to `GET_LEADERBOARD_DATA`

**Data**:
- Top 10 players by score
- Current player's rank and score
- Sorted by score descending

### GIVE_POST_DATA
**Purpose**: Provide updated game data

**Message Structure**:
```typescript
{
  type: "GIVE_POST_DATA";
  payload: {
    postId: string;
    deck: Deck;
    playerSession: PlayerSession | null;
    userId: string;
    username: string;
    playerRank: number | null;
    isAdmin: boolean;
  }
}
```

**Triggers**: Response to `GET_POST_DATA`, `ADD_QUESTION`, `EDIT_QUESTION`, `DELETE_QUESTION`

**Usage**: Synchronize client state after server changes

## Message Flow Patterns

### Game Initialization Flow

```
1. WebView loads → Client sends INIT
2. Devvit receives INIT → Loads deck from Redis
3. Devvit gets player session → Verifies admin status
4. Devvit sends INIT_RESPONSE → Client initializes UI
5. Client ready for gameplay
```

### Gameplay Completion Flow

```
1. Player finishes game → Client sends COMPLETE_GAME
2. Devvit validates answers → Recalculates scores
3. Devvit updates statistics → Saves player session
4. Devvit updates leaderboard → Sends CONFIRM_SAVE_PLAYER_DATA
5. Client shows results → Updates leaderboard display
```

### Admin Operation Flow

```
1. Admin makes change → Client sends EDIT_QUESTION/DELETE_QUESTION
2. Devvit validates permissions → Applies changes to Redis
3. Devvit sends GIVE_POST_DATA → Client refreshes deck
4. Client updates UI → Shows modified content
```

## Error Handling

### Client-Side Error Handling

```typescript
// Message sending with error handling
const sendToDevvit = (message: WebviewToBlockMessage) => {
  try {
    window.parent.postMessage({
      type: 'devvit-message',
      data: { message }
    }, '*');
  } catch (error) {
    console.error('Failed to send message to Devvit:', error);
    // Fallback UI or retry logic
  }
};
```

### Server-Side Error Handling

```typescript
// Devvit message processing with error boundaries
try {
  const result = await processMessage(message);
  postMessage({
    type: responseType,
    payload: result
  });
} catch (error) {
  console.error('Message processing error:', error);
  postMessage({
    type: 'ERROR',
    payload: { message: 'Operation failed' }
  });
}
```

### Timeout Handling

```typescript
// Client-side timeout for responses
const sendWithTimeout = (message: WebviewToBlockMessage, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Message timeout'));
    }, timeout);

    // Set up response listener
    const handleResponse = (event: MessageEvent) => {
      clearTimeout(timer);
      resolve(event.data);
    };

    sendToDevvit(message);
  });
};
```

## Message Validation

### Type Safety

All messages are validated through TypeScript interfaces:

```typescript
// Compile-time validation
const message: WebviewToBlockMessage = {
  type: "INIT" // TypeScript ensures correct payload structure
};
```

### Runtime Validation

```typescript
// Runtime message validation
const validateMessage = (message: any): message is WebviewToBlockMessage => {
  if (!message || typeof message.type !== 'string') return false;

  switch (message.type) {
    case 'INIT':
      return !message.payload; // No payload expected
    case 'COMPLETE_GAME':
      return message.payload &&
             Array.isArray(message.payload.answers) &&
             typeof message.payload.totalScore === 'number';
    // ... additional validation
  }
};
```

## Performance Optimizations

### Message Batching

For high-frequency operations:

```typescript
// Batch multiple updates
const batchMessages = (messages: WebviewToBlockMessage[]) => {
  // Send as single batch message
  sendToDevvit({
    type: 'BATCH_UPDATE',
    payload: { messages }
  });
};
```

### Message Prioritization

```typescript
enum MessagePriority {
  HIGH = 'high',    // Game completion, errors
  MEDIUM = 'medium', // Leaderboard updates
  LOW = 'low'       // Background sync
}
```

### Compression

For large payloads:

```typescript
// Compress large deck data
const compressPayload = (payload: any): string => {
  return JSON.stringify(payload); // Could use more advanced compression
};
```

## Security Considerations

### Input Validation

All incoming messages are validated:

```typescript
const sanitizeMessage = (message: any) => {
  // Remove potentially harmful content
  // Validate data types and ranges
  // Check for malicious payloads
};
```

### Authentication

Messages requiring user context:

```typescript
const validateUserContext = async (message: WebviewToBlockMessage) => {
  const user = await context.reddit.getCurrentUser();
  if (!user) throw new Error('Authentication required');
  return user;
};
```

### Rate Limiting

Prevent message spam:

```typescript
const rateLimiter = new Map<string, number[]>();

const checkRateLimit = (userId: string, maxPerMinute = 60) => {
  const now = Date.now();
  const window = 60 * 1000; // 1 minute

  if (!rateLimiter.has(userId)) {
    rateLimiter.set(userId, []);
  }

  const timestamps = rateLimiter.get(userId)!;
  // Remove old timestamps
  const validTimestamps = timestamps.filter(t => now - t < window);

  if (validTimestamps.length >= maxPerMinute) {
    throw new Error('Rate limit exceeded');
  }

  validTimestamps.push(now);
  rateLimiter.set(userId, validTimestamps);
};
```

## Testing Message Protocols

### Unit Testing

```typescript
describe('Message Protocols', () => {
  test('INIT message structure', () => {
    const message: WebviewToBlockMessage = { type: 'INIT' };
    expect(validateMessage(message)).toBe(true);
  });

  test('COMPLETE_GAME payload validation', () => {
    const message: WebviewToBlockMessage = {
      type: 'COMPLETE_GAME',
      payload: {
        answers: [],
        totalScore: 100,
        sessionData: mockSession
      }
    };
    expect(validateMessage(message)).toBe(true);
  });
});
```

### Integration Testing

```typescript
describe('Message Flow', () => {
  test('Complete game flow', async () => {
    // Mock client sending COMPLETE_GAME
    // Verify server processes correctly
    // Check response format
    // Validate data persistence
  });
});
```

### Load Testing

```typescript
describe('Performance', () => {
  test('High-frequency messaging', async () => {
    // Send multiple messages rapidly
    // Verify no message loss
    // Check response times
    // Monitor memory usage
  });
});
```

## Debugging Tools

### Message Logging

```typescript
const logMessage = (direction: 'in' | 'out', message: any) => {
  console.log(`[${direction.toUpperCase()}] ${message.type}`, {
    timestamp: new Date().toISOString(),
    payload: message.payload,
    userId: context.userId
  });
};
```

### Message Tracing

```typescript
const traceMessage = (messageId: string, message: WebviewToBlockMessage) => {
  // Add correlation ID for tracking
  // Log message lifecycle
  // Measure processing time
  // Track success/failure
};
```

## Future Enhancements

### Binary Protocols

For improved performance with large payloads:

```typescript
// Future: Binary message format
type BinaryMessage = {
  type: MessageType;
  payload: Uint8Array; // Compressed binary data
};
```

### WebSocket Support

For real-time features:

```typescript
// Future: WebSocket-based messaging
const wsConnection = new WebSocket('wss://devvit.reddit.com/game');

wsConnection.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleMessage(message);
};
```

### Message Versioning

For backward compatibility:

```typescript
type VersionedMessage = {
  version: string;
  type: MessageType;
  payload: any;
};
```

This message protocol system provides a robust, type-safe, and scalable foundation for client-server communication in Debate Dueler.