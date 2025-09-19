# Client Application

The client-side application is a React-based webview that runs within Reddit posts, providing the interactive game experience for players.

## Architecture

Located in `src/client/`, the client application consists of:

- **Main App** (`App.tsx`): Entry point that renders the main DebateDueler component
- **Components** (`components/`): React components for different game screens
- **Hooks** (`hooks/`): Custom React hooks for state management and API communication
- **API Layer** (`api.ts`): Communication with the server
- **Assets** (`public/`): Static files and styling

## Core Components

### DebateDueler (`components/DebateDueler.tsx`)

The main orchestrator component that manages the entire game flow:

- **Game Phases**: welcome → playing → results → admin
- **State Management**: Local game state, player session, scoring
- **Local Scoring**: Calculates scores client-side for immediate feedback
- **Persistence**: Uses localStorage to survive page refreshes
- **Error Handling**: Graceful error states and recovery

**Key Features:**
- Initializes game data from server
- Manages local answer processing during gameplay
- Handles game completion and final score submission
- Supports admin functionality for moderators

### Screen Components

#### WelcomeScreen (`components/WelcomeScreen.tsx`)
- Game mode selection (Contrarian/Conformist/Trivia)
- Deck information display
- Start game functionality

#### GameScreen (`components/GameScreen.tsx`)
- Question display with timer
- Answer collection (multiple choice or sequence)
- Real-time scoring feedback
- Progress tracking

#### ResultsScreen (`components/ResultsScreen.tsx`)
- Final scores and leaderboard
- Game statistics
- Restart game option
- Admin panel access (for moderators)

#### AdminScreen (`components/adminScreen.tsx`)
- Question management
- Deck editing
- User moderation tools

### Supporting Components

#### AnswerCards (`components/AnswerCards.tsx`)
- Interactive answer selection
- Visual feedback for user choices

#### LiveBackground (`components/LiveBackground.tsx`)
- Animated background effects
- Visual engagement during gameplay

## State Management

The client uses React hooks for state management:

- **useState**: Local component state
- **useEffect**: Side effects and API calls
- **useCallback**: Memoized event handlers
- **Custom Hooks**: Reusable logic (e.g., `useDevvitListener.tsx`)

## API Communication

The client communicates with the server through `api.ts`:

- **Initialization**: Fetch game deck and player session
- **Answer Submission**: Send answers and receive scoring
- **Game Completion**: Submit final results
- **Leaderboard**: Fetch real-time rankings

## Local Storage Strategy

To provide a smooth user experience, the client uses localStorage for:

- **Game State Persistence**: Survive page refreshes during gameplay
- **Timer State**: Maintain question timers
- **User Preferences**: Remember settings

## Scoring System

The client implements local scoring for immediate feedback:

- **Real-time Calculation**: Uses shared scoring algorithms
- **Optimistic Updates**: Updates UI before server confirmation
- **Fallback Handling**: Graceful degradation if server calls fail

## Performance Optimizations

- **Lazy Loading**: Questions loaded as needed
- **Local Processing**: Minimize server round-trips during gameplay
- **Efficient Re-renders**: Memoized components and callbacks
- **Asset Optimization**: Optimized static files

## Responsive Design

Built with Tailwind CSS for responsive design:

- **Mobile-First**: Optimized for Reddit mobile app
- **Cross-Platform**: Works on web and mobile Reddit clients
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Development

The client uses modern React development practices:

- **TypeScript**: Type safety throughout
- **Vite**: Fast development server and build tool
- **ESLint**: Code quality enforcement
- **Hot Reload**: Instant updates during development