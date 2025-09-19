# Debate Dueler Documentation

## Overview

Debate Dueler is an interactive Reddit app built with [Devvit](https://developers.reddit.com/docs/) that creates engaging quiz-style games within Reddit posts. Players compete in real-time trivia games with unique scoring mechanics that reward different strategies.

## Key Features

- **Three Scoring Modes**: Contrarian, Conformist, and Trivia
- **Multiple Question Types**: Multiple choice and sequence-based questions
- **Real-time Leaderboards**: Live competition tracking
- **Community Content**: Players can add their own questions
- **Admin Panel**: Moderators can manage game content
- **Cross-platform**: Works seamlessly on Reddit web and mobile

## Architecture

The app consists of three main components:

- **Client** (`src/client/`): React application running in Reddit webviews
- **Devvit Backend** (`src/devvit/`): Reddit app logic and Redis operations
- **Shared** (`src/shared/`): Common TypeScript types and utilities

## Quick Start

### Prerequisites

- Node.js 18+
- Reddit Developer Account
- Devvit CLI installed globally

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd debate-dueler

# Install dependencies
npm install

# Login to Devvit
npx devvit login

# Start development server
npm run dev
```

### Development

```bash
# Start the development server
npm run dev

# Build for production
npm run build

# Deploy to Reddit
npm run deploy
```

## Documentation Structure

- [Architecture](architecture.md) - System design and data flow
- [Data Structures](data-structures.md) - TypeScript interfaces and models
- [Client Components](client-components.md) - React components and UI logic
- [Devvit Backend](devvit-backend.md) - Redis operations and server-side logic
- [Scoring System](scoring-system.md) - Game mechanics and algorithms
- [Message Protocols](message-protocols.md) - WebView-to-Devvit communication
- [Admin Features](admin-features.md) - Moderator capabilities
- [Development Workflow](development-workflow.md) - Contribution guidelines
- [Deployment](deployment.md) - Publishing Reddit apps

## Game Mechanics

### Scoring Modes

1. **Contrarian**: Score higher by choosing less popular answers
2. **Conformist**: Score higher by choosing more popular answers
3. **Trivia**: Traditional scoring based on correct answers

### Question Types

- **Multiple Choice**: Select one correct answer from options
- **Sequence**: Arrange items in the correct order

### Real-time Features

- Live leaderboard updates
- Community question submissions
- Instant scoring feedback
- Admin moderation tools

## Contributing

See [Development Workflow](development-workflow.md) for detailed contribution guidelines.

## License

This project is licensed under the MIT License - see the LICENSE file for details.