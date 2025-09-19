# Data Structures and Types

This document outlines the core TypeScript interfaces and data structures used throughout the Debate Dueler application.

## Core Game Types

### ScoringMode
```typescript
type ScoringMode = 'contrarian' | 'conformist' | 'trivia';
```
Defines the three scoring strategies available to players:
- **contrarian**: Score higher by choosing less popular answers
- **conformist**: Score higher by choosing more popular answers
- **trivia**: Traditional scoring based on correct answers

### QuestionType
```typescript
type QuestionType = 'multiple-choice' | 'sequence';
```
Supported question formats:
- **multiple-choice**: Single correct answer from multiple options
- **sequence**: Arrange items in correct order

### GameState
```typescript
type GameState = 'waiting' | 'playing' | 'finished';
```
Represents the current state of a player's game session.

## Data Models

### GameCard
```typescript
type GameCard = {
  id: string;
  text: string;
  isCorrect?: boolean;     // For trivia mode
  sequenceOrder?: number;  // For sequence questions
};
```
Represents an individual answer option or sequence item.

### Question
```typescript
type Question = {
  id: string;
  prompt: string;
  cards: GameCard[];
  timeLimit: number;
  authorUsername?: string;
  questionType?: QuestionType;
};
```
Complete question structure containing the prompt, answer options, and metadata.

### QuestionStats
```typescript
type QuestionStats = {
  questionId: string;
  cardStats: Record<string, number>;        // cardId -> count
  positionStats?: Record<string, Record<number, number>>; // NEW: Position-specific counts
  totalResponses: number;
};
```
Tracks community voting patterns and statistics for each question.

### Deck
```typescript
type Deck = {
  id: string;
  title: string;
  description: string;
  theme: string;
  flairText?: string;
  flairCSS?: string;
  questions: Question[];
  questionStats?: QuestionStats[];
  createdBy: string;
  creatorID?: string;
  createdAt: number;
};
```
Complete game configuration containing all questions and metadata.

### PlayerAnswer
```typescript
type PlayerAnswer = {
  questionId: string;
  answer: string | string[];  // Single ID or sequence array
  timeRemaining: number;
  timestamp: number;
};
```
Records individual player responses with timing information.

### PlayerSession
```typescript
type PlayerSession = {
  userId: string;
  username: string;
  scoringMode: ScoringMode;
  answers: PlayerAnswer[];
  totalScore: number;
  currentQuestionIndex: number;
  gameState: GameState;
  startedAt: number;
  finishedAt?: number;
};
```
Tracks a player's complete game session and progress.

### LeaderboardEntry
```typescript
type LeaderboardEntry = {
  userId: string;
  username: string;
  score: number;
  scoringMode: ScoringMode;
  completedAt: number;
};
```
Represents a player's entry in the leaderboard.

## API Response Types

### Generic Response Wrapper
```typescript
type Response<T> = { status: 'error'; message: string } | ({ status: 'success' } & T);
```

### Specific Response Types
```typescript
type InitGameResponse = Response<{
  deck: Deck;
  playerSession?: PlayerSession;
}>;

type SubmitAnswerResponse = Response<{
  score: number;
  questionStats: QuestionStats;
  isGameComplete: boolean;
  nextQuestionIndex?: number;
}>;

type LeaderboardResponse = Response<{
  leaderboard: LeaderboardEntry[];
  playerRank?: number;
  playerScore?: number;
}>;

type CreateQuestionResponse = Response<{
  questionId: string;
}>;

type CreateDeckResponse = Response<{
  deckId: string;
  postId: string;
  postUrl?: string;
}>;
```

## Message Protocol Types

### WebView to Devvit Messages
```typescript
type WebviewToBlockMessage =
  | { type: "INIT" }
  | { type: "CREATE_NEW_POST"; payload: { postData: Deck } }
  | { type: "GET_LEADERBOARD_DATA" }
  | { type: "COMPLETE_GAME"; payload: { answers: PlayerAnswer[], totalScore: number, sessionData: PlayerSession } }
  | { type: "ADD_QUESTION"; payload: { question: Question } }
  | { type: "GET_POST_DATA" }
  | { type: "EDIT_QUESTION"; payload: { question: Question } }
  | { type: "DELETE_QUESTION"; payload: { questionId: string } };
```

### Devvit to WebView Messages
```typescript
type BlocksToWebviewMessage = {
  type: "INIT_RESPONSE";
  payload: {
    postId: string;
    deck: Deck;
    playerSession: PlayerSession | null;
    userId: string;
    username: string;
    playerRank: number | null;
    isAdmin: boolean;
  };
} | {
  type: "CONFIRM_SAVE_PLAYER_DATA";
  payload: { isSaved: boolean };
} | {
  type: "GIVE_LEADERBOARD_DATA";
  payload: {
    leaderboard: LeaderboardEntry[];
    playerRank: number | null;
    playerScore: number | null;
  };
} | {
  type: "GIVE_POST_DATA";
  payload: {
    postId: string;
    deck: Deck;
    playerSession: PlayerSession | null;
    userId: string;
    username: string;
    playerRank: number | null;
    isAdmin: boolean;
  };
};
```

### Devvit System Message Wrapper
```typescript
type DevvitMessage = {
  type: "devvit-message";
  data: { message: BlocksToWebviewMessage };
};
```

## Redis Service Interface

### RedisService Type
```typescript
type RedisService = {
  // Leaderboard operations
  getLeaderboard: (postId: string) => Promise<LeaderboardEntry[]>;
  updateLeaderboard: (postId: string, entry: LeaderboardEntry) => Promise<void>;

  // Player data operations
  saveUserGameData: (postId: string, userId: string, answers: PlayerAnswer[], totalScore: number, sessionData: PlayerSession) => Promise<void>;
  getPlayerRank: (postId: string, userId: string) => Promise<number | null>;
  getPlayerSession: (postId: string, userId: string) => Promise<PlayerSession | null>;

  // Post operations
  getDeck: (postId: string) => Promise<Deck | null>;
  saveDeck: (postId: string, deck: Deck) => Promise<void>;

  // Utility operations
  addQuestionToDeck: (postId: string, question: Question) => Promise<void>;
  editQuestionInDeck: (postId: string, updatedQuestion: Question) => Promise<void>;
  deleteQuestionFromDeck: (postId: string, questionId: string) => Promise<void>;
};
```

## Component Props Types

### GameScreen Props
```typescript
interface GameScreenProps {
  deck: Deck;
  playerSession: PlayerSession;
  onSubmitAnswer: (answer: string | string[], timeRemaining: number) => Promise<SubmitAnswerResponse | undefined>;
}
```

### DebateDueler Props
```typescript
interface DebateDuelerProps {
  // No props - self-contained component
}
```

## Constants and Configuration

### Game Configuration
```typescript
// Located in src/client/components/comComponents/constants.ts
export const GAME_CONSTANTS = {
  ANSWER_DISPLAY_MS: 3500,
  DEFAULT_TIME_LIMIT: 20,
  LEADERBOARD_LIMIT: 10,
  MIN_QUESTIONS: 5,
  MAX_QUESTIONS: 10,
};
```

### Scoring Weights
```typescript
export const SCORING_WEIGHTS = {
  BASE_SCORE: 100,
  TIME_BONUS_MULTIPLIER: 1,
  CONFORMIST_MULTIPLIER: 1,
  CONTRARIAN_MULTIPLIER: 1,
};
```

## Data Relationships

### Entity Relationships
```
Deck (1) ──── (many) Question
Question (1) ──── (many) GameCard
Question (1) ──── (1) QuestionStats
PlayerSession (1) ──── (many) PlayerAnswer
Deck (1) ──── (many) PlayerSession
```

### Data Flow Dependencies
```
GameCard.isCorrect ──→ Trivia scoring
GameCard.sequenceOrder ──→ Sequence question validation
QuestionStats.cardStats ──→ Popularity-based scoring
QuestionStats.positionStats ──→ Sequence position scoring
PlayerAnswer.timeRemaining ──→ Time bonus calculation
```

## Validation Rules

### Question Validation
- Must have at least 2 cards
- Must have a non-empty prompt
- Time limit must be positive
- For trivia mode: exactly one card must be marked as correct
- For sequence mode: cards must have sequenceOrder values

### Deck Validation
- Must have at least 5 questions
- Must have non-empty title and description
- Theme must be valid
- All questions must be valid

### Player Session Validation
- User ID and username required
- Valid scoring mode required
- Answers array must match questions
- Total score must be calculable from answers

## Serialization Notes

### JSON Storage
All data structures are designed to be JSON-serializable for Redis storage:
- Date objects stored as timestamps (numbers)
- No circular references
- Optional fields handled gracefully
- Complex types broken down into primitives

### Message Passing
WebView messages use JSON serialization:
- Enums converted to string literals
- Optional fields preserved
- Type safety maintained through TypeScript
- Backward compatibility considerations

## Migration Considerations

### Versioning
Data structures include versioning considerations:
- New optional fields don't break existing data
- Migration scripts for major changes
- Backward compatibility for message types
- Graceful degradation for missing fields

### Extensibility
Structures designed for future enhancements:
- Generic container types for new features
- Extensible scoring modes
- Flexible question types
- Metadata fields for future use