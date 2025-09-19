# Server Application

The server-side application is an Express.js API that handles game logic, data persistence, and communication with Reddit's Devvit platform. Located in `src/server/`, it provides RESTful endpoints for the client application.

## Architecture

```
src/server/
├── index.ts          # Main Express server and API routes
├── core/
│   ├── game.ts       # Game logic and Redis operations
│   ├── decks.ts      # Deck management and default content
│   └── post.ts       # Reddit post creation utilities
└── vite.config.ts    # Build configuration
```

## Core Components

### Express Server (`index.ts`)

The main server file that sets up Express middleware and defines all API endpoints:

- **Middleware**: JSON parsing, URL encoding, and request handling
- **Routes**: RESTful API endpoints for game operations
- **Devvit Integration**: Uses Reddit context and Redis client
- **Error Handling**: Comprehensive error responses and logging

### Game Logic (`core/game.ts`)

Handles all Redis-based data operations and game mechanics:

- **Session Management**: Player sessions, game state, and progress tracking
- **Answer Recording**: Statistics collection for community voting
- **Leaderboard System**: Real-time ranking with Redis sorted sets
- **Question Statistics**: Response tracking and popularity analysis

**Redis Key Patterns:**
```
game:{postId}:player:{userId}     # Player session data
stats:{postId}:{questionId}       # Question statistics
leaderboard:{postId}              # Sorted set of player scores
deck:{postId}                     # Game deck and questions
```

### Deck Management (`core/decks.ts`)

Manages game content and provides default decks:

- **Default Decks**: Pre-built question sets with various themes
- **Validation**: Ensures deck structure and content quality
- **Question Types**: Support for multiple choice and sequence questions

### Post Creation (`core/post.ts`)

Handles Reddit post creation through Devvit:

- **Custom Posts**: Creates interactive Reddit posts with game content
- **Splash Screen**: Configures post appearance and metadata
- **Deck Association**: Links game decks to Reddit posts

## API Endpoints

### Game Management
- `GET /api/init` - Initialize game and get deck data
- `POST /api/complete-game` - Submit final game results
- `GET /api/post-data` - Refresh game data

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard rankings

### Question Management
- `POST /api/add-question` - Add community questions
- `POST /api/edit-question` - Edit existing questions
- `POST /api/delete-question` - Remove questions

### Administrative
- `POST /api/create-post` - Create new game posts
- `POST /internal/menu/post-create` - Menu action for post creation
- `POST /internal/menu/clear-redis` - Clear Redis data

## Data Flow

### Game Initialization
1. Client requests `/api/init`
2. Server loads or creates deck for the post
3. Shuffles questions and loads statistics
4. Returns deck, player session, and admin status

### Answer Processing
1. Client submits answers locally during gameplay
2. On game completion, sends all answers to `/api/complete-game`
3. Server recalculates scores with real community data
4. Updates player session and leaderboard
5. Returns final results

### Real-time Features
- **Statistics Updates**: Each answer contributes to community voting
- **Leaderboard**: Automatically updated with new scores
- **Admin Controls**: Moderators can manage content in real-time

## Security & Validation

- **Authentication**: Relies on Reddit's user authentication
- **Authorization**: Admin checks via Reddit moderator permissions
- **Input Validation**: Comprehensive validation for all user inputs
- **Rate Limiting**: Prevents spam question submissions
- **Data Sanitization**: Safe handling of user-generated content

## Performance Optimizations

- **Redis Efficiency**: Optimized data structures for fast queries
- **Lazy Loading**: Questions loaded on-demand
- **Batch Operations**: Efficient bulk data operations
- **Caching**: Strategic use of Redis for frequently accessed data

## Development Features

- **Hot Reloading**: Development server with live updates
- **TypeScript**: Full type safety across the server
- **Error Logging**: Comprehensive logging for debugging
- **Environment Handling**: Proper configuration management

## Deployment

The server deploys as part of the Reddit app:

- **Single Deployment**: One app instance serves all games
- **Per-Post Isolation**: Each Reddit post maintains separate data
- **Scalable Storage**: Redis handles concurrent game sessions
- **Reddit Integration**: Native integration with Reddit's infrastructure