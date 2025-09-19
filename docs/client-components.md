# Client Components Documentation

This document details the React components that make up the Debate Dueler webview client application.

## Component Hierarchy

```
DebateDueler (Root)
├── WelcomeScreen
├── GameScreen
│   ├── LiveBackground
│   ├── AnswerCards
│   └── Timer/Progress UI
├── ResultsScreen
└── AdminScreen
    └── deckWizard
```

## Core Components

### DebateDueler (Root Component)

**File**: `src/client/components/DebateDueler.tsx`

**Purpose**: Main orchestrator component that manages the overall game flow and state.

**Key Responsibilities**:
- Game phase management (welcome → playing → results → admin)
- Player session state management
- Communication with Devvit backend
- Local storage persistence
- Admin status handling

**State Management**:
```typescript
const [gamePhase, setGamePhase] = useState<GamePhase>('welcome');
const [deck, setDeck] = useState<Deck | null>(null);
const [playerSession, setPlayerSession] = useState<PlayerSession | null>(null);
const [isAdmin, setIsAdmin] = useState(false);
const [localAnswers, setLocalAnswers] = useState<PlayerAnswer[]>([]);
const [localScore, setLocalScore] = useState<number>(0);
```

**Key Methods**:
- `startGame()`: Initializes new game session
- `submitFinalResults()`: Sends completed game to server
- `restartGame()`: Resets game state
- `goToAdminScreen()`: Switches to admin interface

### WelcomeScreen

**File**: `src/client/components/WelcomeScreen.tsx`

**Purpose**: Initial screen where players select their scoring mode and start the game.

**Features**:
- Deck information display (title, description, question count)
- Scoring mode selection with explanations
- Existing session resumption
- Responsive design with gradient backgrounds

**Scoring Mode Explanations**:
- **Contrarian**: "Go against the crowd - score higher with unpopular answers!"
- **Conformist**: "Follow the crowd - score higher with popular answers!"
- **Trivia**: "Classic mode - get the right answers!"

### GameScreen

**File**: `src/client/components/GameScreen.tsx`

**Purpose**: Core gameplay component handling question display, answer collection, and scoring.

**Key Features**:
- Real-time countdown timer
- Question expansion overlay
- Progress tracking
- Answer visualization with community stats
- Sequence question support
- Local score calculation

**State Management**:
```typescript
const [timeRemaining, setTimeRemaining] = useState(20);
const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
const [showResults, setShowResults] = useState(false);
const [sequenceOrder, setSequenceOrder] = useState<Record<string, number>>({});
const [lastScore, setLastScore] = useState<number>(0);
```

**Timer Logic**:
- Auto-submit on timeout
- Local storage persistence for timer state
- Visual countdown with color changes (< 5 seconds = red)

**Answer Processing**:
- Multiple choice: Single card selection
- Sequence: Drag-and-drop or click ordering
- Time bonus calculation
- Immediate local scoring feedback

### AnswerCards

**File**: `src/client/components/AnswerCards.tsx`

**Purpose**: Renders interactive answer options with community statistics and visual feedback.

**Features**:
- Dynamic card layout (2x2 grid, single column for sequences)
- Popularity percentage display
- Color-coded scoring feedback
- Sequence ordering interface
- Touch and mouse support

**Visual States**:
- **Default**: Neutral styling
- **Selected**: Highlighted border
- **Results**: Color gradients based on scoring mode
- **Sequence**: Number badges and reorder indicators

### LiveBackground

**File**: `src/client/components/LiveBackground.tsx`

**Purpose**: Animated background that responds to game state and player actions.

**Features**:
- Dynamic color gradients based on answer popularity
- Scoring mode-specific color schemes
- Smooth transitions and animations
- Performance optimized with CSS transforms

**Color Logic**:
```typescript
// Contrarian: Red (unpopular) to Green (popular)
const hue = 120 * (percentage / 100);

// Conformist: Green (popular) to Red (unpopular)
const hue = 120 * (1 - (percentage / 100));

// Trivia: Green (correct) or Red (incorrect)
const backgroundColor = isCorrect ? 'rgba(0, 100, 0, 0.7)' : 'rgba(100, 0, 0, 0.7)';
```

### ResultsScreen

**File**: `src/client/components/ResultsScreen.tsx`

**Purpose**: Displays final game results, leaderboard, and options for next steps.

**Features**:
- Final score animation
- Leaderboard with player ranking
- Scoring mode breakdown
- Restart and admin access options
- Social sharing prompts

**Admin Features**:
- Conditional admin button for moderators
- Direct access to deck management

### AdminScreen

**File**: `src/client/components/adminScreen.tsx`

**Purpose**: Administrative interface for moderators to manage game content.

**Features**:
- Question CRUD operations
- Deck statistics overview
- Player management
- Real-time updates

**Permissions**:
- Restricted to subreddit moderators
- Verified through Devvit backend

## Supporting Components

### deckWizard

**File**: `src/client/components/comComponents/deckWizard.tsx`

**Purpose**: Wizard interface for creating and editing question decks.

**Features**:
- Step-by-step deck creation
- Question builder with multiple card types
- Preview functionality
- Validation and error handling

**Workflow**:
1. Deck metadata (title, description, theme)
2. Question creation loop
3. Card definition for each question
4. Preview and publish

## Hooks and Utilities

### useDevvitListener

**File**: `src/client/hooks/useDevvitListener.tsx`

**Purpose**: Custom hook for handling messages from the Devvit backend.

**Usage**:
```typescript
const initResponse = useDevvitListener('INIT_RESPONSE');
const leaderboardData = useDevvitListener('GIVE_LEADERBOARD_DATA');
```

**Features**:
- Type-safe message handling
- Automatic cleanup
- Error handling for malformed messages

### usePage

**File**: `src/client/hooks/usePage.tsx`

**Purpose**: Manages page-level state and navigation within the webview.

**Features**:
- URL parameter parsing
- Navigation state management
- Deep linking support

### sendToDevvit

**File**: `src/client/utils.ts`

**Purpose**: Utility function for sending messages to the Devvit backend.

**Usage**:
```typescript
sendToDevvit({
  type: 'COMPLETE_GAME',
  payload: { answers, totalScore, sessionData }
});
```

**Features**:
- Message queuing
- Error handling
- Type validation

## UI/UX Patterns

### Responsive Design
- Mobile-first approach
- Flexible layouts using CSS Grid and Flexbox
- Clamp() functions for scalable typography
- Touch-friendly interactive elements

### Animation System
- CSS transitions for state changes
- Score counting animations
- Progress bar animations
- Background color transitions

### Accessibility
- Keyboard navigation support
- Screen reader friendly
- High contrast color schemes
- Focus management

### Performance Optimizations
- React.memo for expensive components
- useMemo for computed values
- useCallback for event handlers
- Lazy loading for non-critical components

## Component Communication

### Props Flow
```
DebateDueler
├── deck: Deck
├── playerSession: PlayerSession
├── onSubmitAnswer: (answer, time) => Promise<Response>
└── isAdmin: boolean

GameScreen
├── deck: Deck
├── playerSession: PlayerSession
├── onSubmitAnswer: (answer, time) => Promise<Response>
└── children: AnswerCards + LiveBackground
```

### Event Bubbling
- Answer selections bubble up to DebateDueler
- Score updates trigger re-renders down the tree
- Admin actions trigger data refresh requests

### State Synchronization
- Local state for immediate UI feedback
- Server state for authoritative data
- Conflict resolution for offline scenarios

## Error Handling

### Network Errors
- Graceful degradation for lost connections
- Retry mechanisms for failed requests
- User-friendly error messages

### Data Validation
- TypeScript for compile-time validation
- Runtime validation for API responses
- Fallback UI for missing data

### Recovery Mechanisms
- Local storage for game state persistence
- Automatic reconnection handling
- Manual refresh options

## Testing Strategy

### Unit Tests
- Component rendering tests
- Hook logic tests
- Utility function tests

### Integration Tests
- Component interaction tests
- Message passing tests
- State management tests

### E2E Tests
- Complete game flow tests
- Cross-browser compatibility
- Mobile responsiveness tests

## Development Guidelines

### Component Structure
- Functional components with hooks
- Clear separation of concerns
- Prop validation with TypeScript
- Comprehensive error boundaries

### Code Organization
- Feature-based file structure
- Shared utilities in separate files
- Consistent naming conventions
- Comprehensive documentation

### Performance Best Practices
- Minimize re-renders with memoization
- Optimize bundle size
- Efficient event handling
- Memory leak prevention