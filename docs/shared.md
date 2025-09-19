# Shared Code

The shared code contains common TypeScript definitions, algorithms, and utilities used across both client and server applications. Located in `src/shared/`, this code ensures consistency and reusability.

## Architecture

```
src/shared/
├── types/
│   ├── game.ts       # Core game data structures
│   ├── api.ts        # API communication types
│   └── message.ts    # Message protocol types
├── scoring.ts        # Scoring algorithms
├── data/
│   └── emoticons.ts  # UI feedback emoticons
└── tsconfig.json     # TypeScript configuration
```

## Core Types (`types/game.ts`)

Defines all data structures used throughout the application:

### Game Entities
- **ScoringMode**: `'contrarian' | 'conformist' | 'trivia'`
- **QuestionType**: `'multiple-choice' | 'sequence'`
- **GameState**: `'waiting' | 'playing' | 'finished'`

### Data Models
- **GameCard**: Individual answer options with text and metadata
- **Question**: Question structure with cards, timing, and type
- **Deck**: Collection of questions with metadata
- **PlayerSession**: User's game progress and state
- **PlayerAnswer**: Individual answer submissions

### Statistics & Leaderboards
- **QuestionStats**: Community voting data for each question
- **LeaderboardEntry**: Player ranking information

### API Types
- **InitGameResponse**: Game initialization data
- **SubmitAnswerResponse**: Answer submission results
- **LeaderboardResponse**: Ranking data

## Scoring System (`scoring.ts`)

Contains the core algorithms that determine player scores:

### Scoring Modes

#### Contrarian Mode
```typescript
// Score higher by choosing less popular answers
const popularity = getCardPercentage(cardId) / 100;
return Math.round((1 - popularity) * 100) + timeBonus;
```

#### Conformist Mode
```typescript
// Score higher by choosing more popular answers
const popularity = getCardPercentage(cardId) / 100;
return Math.round(popularity * 100) + timeBonus;
```

#### Trivia Mode
```typescript
// Traditional correct/incorrect scoring
return card.isCorrect ? 100 + timeBonus : 0;
```

### Question Types

#### Multiple Choice
- Single card selection
- Popularity-based scoring for contrarian/conformist
- Correctness-based for trivia

#### Sequence Questions
- Multiple card ordering
- Position accuracy for trivia mode
- Average popularity for social modes

### Time Bonuses
- 1 point per second remaining
- Encourages quick decision-making
- Applied to all scoring modes

## Emoticons System (`data/emoticons.ts`)

Provides visual feedback based on player performance:

### Emotional Tiers
- **Toxic**: Poor performance (red glow)
- **Disgust**: Below average (orange glow)
- **Neutral**: Average performance (yellow glow)
- **Supportive**: Good performance (green glow)
- **Ecstatic**: Excellent performance (bright green glow)

### Usage
```typescript
// Map percentage to tier (conformist/contrarian)
const tier = getTierByPercentage(75, false); // Supportive

// Map correctness to tier (trivia)
const tier = getTierByCorrectness(true); // Ecstatic
```

### Emoticon Types
- **Emoticons**: Large multi-character expressions
- **Chars**: Small single-codepoint pictographs
- **Weighted**: Probability-based selection for variety

## API Types (`types/api.ts`)

Defines communication protocols between client and server:

- **InitResponse**: Game initialization data
- **IncrementResponse**: Counter updates
- **DecrementResponse**: Counter updates

## Message Types (`types/message.ts`)

WebView-to-Devvit communication protocols:

- **INIT**: Request initial game data
- **COMPLETE_GAME**: Submit final results
- **ADD_QUESTION**: Submit community questions
- **EDIT_QUESTION**: Modify existing questions
- **GET_LEADERBOARD_DATA**: Request rankings

## Type Safety

All shared code is written in TypeScript with:

- **Strict Type Checking**: Comprehensive type definitions
- **Interface Segregation**: Focused, single-responsibility types
- **Generic Types**: Reusable type patterns
- **Union Types**: Precise value constraints

## Cross-Platform Compatibility

Shared code is designed to work in multiple environments:

- **Browser**: Client-side React application
- **Node.js**: Server-side Express application
- **Devvit Runtime**: Reddit's serverless environment

## Performance Considerations

- **Tree Shaking**: Only imports what's needed
- **Bundle Optimization**: Minimal dependencies
- **Efficient Algorithms**: Fast scoring calculations
- **Memory Efficient**: Lightweight data structures

## Development Practices

- **Pure Functions**: Predictable, testable scoring logic
- **Immutable Data**: Prevents side effects
- **Comprehensive Types**: Self-documenting code
- **Error Handling**: Graceful failure modes