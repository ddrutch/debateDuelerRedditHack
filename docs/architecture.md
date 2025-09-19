# Architecture Overview

## System Architecture

Debate Dueler is built using a hybrid architecture that combines Reddit's native Blocks system with a React-based webview application. The system is divided into three main layers:

```
┌─────────────────┐
│   Reddit Post   │
│   (Devvit App)  │
└─────────┬───────┘
          │
    ┌─────▼─────┐
    │  Devvit   │
    │  Backend  │
    └─────┬─────┘
          │
    ┌─────▼─────┐
    │   React   │
    │  Webview  │
    │  Client   │
    └───────────┘
```

## Component Breakdown

### 1. Reddit Post Layer (Devvit App)

**Location**: `src/devvit/`

The Devvit app is the entry point that runs within Reddit posts. It handles:

- **Post Creation**: Menu items for moderators to create new Debate Dueler posts
- **Custom Post Type**: Defines the "Dueler" post type with custom rendering
- **WebView Integration**: Manages communication between Reddit and the React client
- **Message Handling**: Processes messages from the webview and coordinates responses

**Key Files**:
- `main.tsx`: Main Devvit application logic and message routing
- `components/GameInterface.tsx`: UI components for the Reddit Blocks interface
- `redisService.ts`: Redis operations and data persistence

### 2. React Webview Client

**Location**: `src/client/`

The React application runs inside an iframe within Reddit posts, providing the interactive game experience:

- **Game Flow**: Manages the complete quiz experience from welcome to results
- **Real-time UI**: Updates scores, timers, and leaderboards dynamically
- **Local Scoring**: Calculates scores client-side for immediate feedback
- **State Management**: Handles game state, player sessions, and local storage

**Key Components**:
- `DebateDueler.tsx`: Main game orchestrator
- `GameScreen.tsx`: Question display and answer collection
- `WelcomeScreen.tsx`: Game mode selection and start
- `ResultsScreen.tsx`: Final scores and leaderboard display

### 3. Shared Types and Utilities

**Location**: `src/shared/`

Common TypeScript definitions and utilities used across both client and server:

- **Type Definitions**: Game data structures, message types, API responses
- **Constants**: Game configuration and UI constants
- **Utilities**: Shared helper functions

## Data Flow

### Game Initialization

```
1. User visits Reddit post
2. Devvit loads post data from Redis
3. Devvit sends INIT_RESPONSE to webview
4. React client initializes game state
5. User selects scoring mode
6. Client creates local player session
```

### During Gameplay

```
1. Client displays question with timer
2. User submits answer
3. Client calculates local score + time bonus
4. Client updates local state and progress
5. On game completion:
   - Client sends COMPLETE_GAME to Devvit
   - Devvit validates and saves final scores
   - Devvit updates leaderboard in Redis
   - Devvit sends confirmation to client
```

### Real-time Features

```
Leaderboard Updates:
- Client requests leaderboard data
- Devvit queries Redis sorted set
- Devvit sends leaderboard to client

Question Management:
- Admin edits questions via client
- Client sends EDIT_QUESTION to Devvit
- Devvit updates Redis deck data
- Devvit broadcasts changes to all clients
```

## Data Storage

### Redis Data Structure

The application uses Redis for persistent data storage with the following key patterns:

```
game:{postId}:player:{userId}     # Player session data
stats:{postId}:{questionId}       # Question statistics
leaderboard:{postId}              # Sorted set of player scores
deck:{postId}                     # Game deck and questions
```

### Local Storage (Client)

The React client uses browser localStorage for:

- Game state persistence across page refreshes
- Timer state during questions
- User preferences

## Message Protocols

Communication between the React client and Devvit backend uses typed message passing:

### Client → Devvit Messages
- `INIT`: Request initial game data
- `COMPLETE_GAME`: Submit final game results
- `ADD_QUESTION`: Submit new community question
- `EDIT_QUESTION`: Modify existing question
- `GET_LEADERBOARD_DATA`: Request leaderboard

### Devvit → Client Messages
- `INIT_RESPONSE`: Initial game data and player session
- `CONFIRM_SAVE_PLAYER_DATA`: Confirmation of saved results
- `GIVE_LEADERBOARD_DATA`: Leaderboard information
- `GIVE_POST_DATA`: Updated deck and session data

## Security Considerations

- **Server-side Validation**: All scoring calculations are validated on the Devvit backend
- **User Authentication**: Relies on Reddit's built-in user authentication
- **Data Sanitization**: Input validation for user-generated content
- **Rate Limiting**: Prevents spam question submissions

## Performance Optimizations

- **Local Scoring**: Immediate feedback without server round-trips
- **Lazy Loading**: Questions loaded as needed
- **Efficient Redis Queries**: Optimized data structures for leaderboard operations
- **WebView Communication**: Batched message passing to reduce overhead

## Deployment Architecture

The application deploys as a single Reddit app that runs across all supported subreddits:

- **Single Deployment**: One app instance serves all games
- **Per-Post Isolation**: Each Reddit post maintains separate game data
- **Scalable Storage**: Redis handles concurrent games efficiently
- **CDN Assets**: Static assets served via Reddit's CDN

## Development vs Production

**Development**:
- Local Devvit server with hot reloading
- Local Redis instance for testing
- Direct access to development tools

**Production**:
- Deployed to Reddit's infrastructure
- Managed Redis instances
- Reddit's monitoring and scaling
- App directory approval process