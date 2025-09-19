# Devvit Backend Documentation

This document details the Devvit backend implementation, focusing on Redis operations, Reddit API integration, and server-side game logic.

## Architecture Overview

The Devvit backend serves as the bridge between the Reddit platform and the React webview client. It handles:

- **Data Persistence**: Redis-based storage for game state and statistics
- **Reddit Integration**: Post creation, user authentication, and moderator permissions
- **Message Routing**: Bidirectional communication with the webview
- **Business Logic**: Server-side validation and scoring calculations

## Core Files

### main.tsx - Main Application Logic

**Location**: `src/devvit/main.tsx`

**Responsibilities**:
- Custom post type registration ("Dueler")
- Menu item creation for moderators
- WebView message handling and routing
- Game session management

**Key Features**:

#### Menu Integration
```typescript
Devvit.addMenuItem({
  label: 'Create Debate Dueler Post',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    // Create new post with preview
  },
});
```

#### Custom Post Type
```typescript
Devvit.addCustomPostType({
  name: 'Dueler',
  height: 'tall',
  render: (context) => {
    // Render game interface with webview
  },
});
```

#### Message Handling
The main message router handles all client communications:

- `INIT`: Initialize game data
- `COMPLETE_GAME`: Process final results
- `ADD_QUESTION`: Add community questions
- `EDIT_QUESTION`: Modify existing questions
- `DELETE_QUESTION`: Remove questions
- `GET_LEADERBOARD_DATA`: Fetch rankings
- `GET_POST_DATA`: Refresh game data

### redisService.ts - Data Persistence Layer

**Location**: `src/devvit/redisService.ts`

**Purpose**: Centralized Redis operations with type-safe interfaces.

#### Redis Key Patterns
```typescript
// Player session data
getPlayerSessionKey = (postId: string, userId: string) =>
  `game:${postId}:player:${userId}`;

// Question statistics
getQuestionStatsKey = (postId: string, questionId: string) =>
  `stats:${postId}:${questionId}`;

// Leaderboard (sorted set)
getLeaderboardKey = (postId: string) =>
  `leaderboard:${postId}`;

// Game deck
getDeckKey = (postId: string) =>
  `deck:${postId}`;
```

#### Core Operations

##### Player Session Management
```typescript
getPlayerSession: async (postId: string, userId: string) => {
  const sessionData = await redis.get(getPlayerSessionKey(postId, userId));
  return sessionData ? JSON.parse(sessionData) : null;
}
```

##### Leaderboard Operations
```typescript
getLeaderboard: async (postId: string) => {
  const allEntries = await redis.zRange(leaderboardKey, 0, -1);
  // Sort and fetch full entry data
  const sortedEntries = [...allEntries].sort((a, b) => b.score - a.score);
  // Return top entries with full data
}
```

##### Deck Management
```typescript
saveDeck: async (postId: string, deck: Deck) => {
  await redis.set(getDeckKey(postId), JSON.stringify(deck));
}

getDeck: async (postId: string) => {
  const deckData = await redis.get(getDeckKey(postId));
  return deckData ? JSON.parse(deckData) : null;
}
```

#### Question CRUD Operations

##### Adding Questions
```typescript
addQuestionToDeck: async (postId: string, question: Question) => {
  const deck = await getDeck(postId);
  if (!deck) {
    // Create default deck if none exists
    deck = createDefaultDeck();
  }

  const newQuestion = {
    ...question,
    id: `user_${Date.now()}_${context.userId}`,
    authorUsername: await context.reddit.getCurrentUsername(),
  };

  deck.questions.push(newQuestion);
  await saveDeck(postId, deck);
}
```

##### Editing Questions
```typescript
editQuestionInDeck: async (postId: string, updatedQuestion: Question) => {
  const deck = await getDeck(postId);
  const questionIndex = deck.questions.findIndex(q => q.id === updatedQuestion.id);

  if (questionIndex !== -1) {
    deck.questions[questionIndex] = updatedQuestion;
    await saveDeck(postId, deck);
  }
}
```

##### Deleting Questions
```typescript
deleteQuestionFromDeck: async (postId: string, questionId: string) => {
  const deck = await getDeck(postId);
  deck.questions = deck.questions.filter(q => q.id !== questionId);

  // Also remove associated statistics
  if (deck.questionStats) {
    deck.questionStats = deck.questionStats.filter(s => s.questionId !== questionId);
  }

  await saveDeck(postId, deck);
}
```

#### Game Completion Processing

##### Score Validation and Saving
```typescript
saveUserGameData: async (postId, userId, answers, totalScore, session) => {
  const deck = await getDeck(postId);

  // Recalculate scores server-side for validation
  let finalScore = 0;
  for (const answer of answers) {
    const question = deck.questions.find(q => q.id === answer.questionId);
    const questionScore = calculateScoreForQuestion({
      scoringMode: session.scoringMode,
      question,
      answer: answer.answer,
      questionStats: getQuestionStats(question.id),
      timeRemaining: answer.timeRemaining,
    });
    finalScore += questionScore;

    // Update community statistics
    updateQuestionStats(postId, question.id, answer);
  }

  // Save validated session
  const finishedSession = { ...session, totalScore: finalScore, gameState: 'finished' };
  await redis.set(getPlayerSessionKey(postId, userId), JSON.stringify(finishedSession));

  // Update leaderboard
  await updateLeaderboard(postId, {
    userId,
    username: session.username,
    score: finalScore,
    scoringMode: session.scoringMode,
    completedAt: Date.now(),
  });
}
```

### Scoring Algorithm Implementation

**Location**: `src/devvit/redisService.ts` (calculateScoreForQuestion function)

The server-side scoring algorithm mirrors the client-side logic but uses authoritative data:

#### Multiple Choice Scoring
```typescript
if (question.questionType === 'multiple-choice') {
  const cardId = answer as string;

  if (scoringMode === 'trivia') {
    const card = question.cards.find(c => c.id === cardId);
    return card?.isCorrect ? 100 + timeRemaining : 0;
  }

  const popularity = questionStats.cardStats[cardId] / questionStats.totalResponses;

  if (scoringMode === 'contrarian') {
    return Math.round((1 - popularity) * 100) + timeRemaining;
  } else { // conformist
    return Math.round(popularity * 100) + timeRemaining;
  }
}
```

#### Sequence Question Scoring
```typescript
if (question.questionType === 'sequence') {
  const sequence = answer as string[];

  if (scoringMode === 'trivia') {
    // Check against correct sequence
    const correctSequence = question.cards
      .filter(c => c.sequenceOrder !== undefined)
      .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
      .map(c => c.id);

    let correctPositions = 0;
    sequence.forEach((cardId, index) => {
      if (correctSequence[index] === cardId) correctPositions++;
    });

    const accuracy = correctPositions / correctSequence.length;
    return Math.round(accuracy * 100) + timeRemaining;
  } else {
    // Community-based scoring using positionStats
    let totalPct = 0;
    sequence.forEach((cardId, index) => {
      const positionCount = questionStats.positionStats?.[cardId]?.[index] || 0;
      const positionTotal = questionStats.totalResponses;
      const positionPct = positionTotal > 0 ? (positionCount / positionTotal) * 100 : 0;
      totalPct += positionPct;
    });

    const averagePct = totalPct / sequence.length;

    if (scoringMode === 'conformist') {
      return Math.round(averagePct) + timeRemaining;
    } else {
      return Math.round(100 - averagePct) + timeRemaining;
    }
  }
}
```

## Statistics Tracking

### Question Statistics Updates
```typescript
updateQuestionStats: async (postId: string, questionId: string, answer: PlayerAnswer) => {
  const statsKey = getQuestionStatsKey(postId, questionId);
  let stats = await getQuestionStats(postId, questionId);

  if (!stats) {
    stats = {
      questionId,
      cardStats: {},
      positionStats: {},
      totalResponses: 0,
    };
  }

  stats.totalResponses++;

  if (typeof answer.answer === 'string') {
    // Multiple choice answer
    stats.cardStats[answer.answer] = (stats.cardStats[answer.answer] || 0) + 1;
  } else {
    // Sequence answer - update both card and position stats
    if (!stats.positionStats) stats.positionStats = {};

    answer.answer.forEach((cardId, position) => {
      // Update general card stats
      stats.cardStats[cardId] = (stats.cardStats[cardId] || 0) + 1;

      // Update position-specific stats
      if (!stats.positionStats[cardId]) {
        stats.positionStats[cardId] = {};
      }
      stats.positionStats[cardId][position + 1] = (stats.positionStats[cardId][position + 1] || 0) + 1;
    });
  }

  await redis.set(statsKey, JSON.stringify(stats));
}
```

## Reddit API Integration

### User Authentication
```typescript
const user = await context.reddit.getCurrentUser();
const username = await context.reddit.getCurrentUsername();
const subredditName = await context.reddit.getCurrentSubredditName();
```

### Moderator Permissions
```typescript
const permissions = await user?.getModPermissionsForSubreddit(subredditName);
const isAdmin = permissions && permissions.length > 0;
```

### Post Management
```typescript
const post = await reddit.submitPost({
  title: 'Debate Dueler Game',
  subredditName: subredditName,
  preview: <PreviewComponent />
});
```

## Error Handling and Validation

### Input Validation
- Question content validation (non-empty prompts, minimum cards)
- User permission checks for admin operations
- Data integrity validation for game submissions

### Error Recovery
- Graceful handling of Redis connection issues
- Fallback to default data when records are missing
- Comprehensive error logging for debugging

### Security Measures
- Server-side score validation prevents cheating
- User authentication verification
- Rate limiting for question submissions
- Input sanitization for user-generated content

## Performance Optimizations

### Redis Operations
- Efficient key design for fast lookups
- Batch operations where possible
- Sorted sets for leaderboard queries
- Hash maps for statistics storage

### Caching Strategy
- Deck data cached in Redis
- Statistics computed incrementally
- Leaderboard results cached with TTL

### Scalability Considerations
- Per-post data isolation
- Horizontal scaling through Redis clustering
- Asynchronous operations for non-blocking responses

## Development and Testing

### Local Development Setup
```typescript
Devvit.configure({
  redis: true,
  realtime: true,
  redditAPI: true,
});
```

### Testing Strategy
- Unit tests for scoring algorithms
- Integration tests for Redis operations
- Mock Reddit API for development
- Load testing for concurrent games

### Debugging Tools
- Comprehensive logging throughout operations
- Redis monitoring and query analysis
- Performance profiling for slow operations
- Error tracking and alerting

## Deployment Considerations

### Environment Configuration
- Production Redis instance configuration
- Reddit app credentials management
- Environment-specific settings

### Monitoring and Maintenance
- Redis memory usage monitoring
- Performance metrics collection
- Automated backup procedures
- Incident response procedures

### Scaling Strategies
- Redis cluster configuration for high traffic
- CDN integration for static assets
- Database optimization for large leaderboards
- Caching layer for frequently accessed data