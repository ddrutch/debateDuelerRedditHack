# Debate Dueler Source Code Documentation

## Overview

Debate Dueler is a real-time competitive trivia game built for Reddit's developer platform. This documentation focuses exclusively on the `src/` folder structure and implementation.

The application is organized into three main layers:

- **Client** (`src/client/`): React-based webview application
- **Server** (`src/server/`): Express server with game logic and Redis integration
- **Shared** (`src/shared/`): Common TypeScript types, scoring algorithms, and utilities

## Game Concept

Debate Dueler is a quiz-style game with three unique scoring modes:

- **Contrarian**: Players score higher by choosing less popular answers
- **Conformist**: Players score higher by choosing more popular answers
- **Trivia**: Traditional scoring based on correct answers

The game supports two question types:
- Multiple choice questions
- Sequence questions (arranging items in correct order)

## Architecture

```
src/
├── client/          # React webview application
│   ├── components/  # UI components
│   ├── hooks/       # Custom React hooks
│   └── public/      # Static assets
├── server/          # Express server
│   └── core/        # Game logic and Redis operations
└── shared/          # Common code
    ├── types/       # TypeScript definitions
    └── scoring.ts   # Scoring algorithms
```

## Key Features

- Real-time leaderboards and competition
- Community question submissions
- Admin panel for content moderation
- Cross-platform Reddit integration
- Persistent game state via Redis
- Responsive React UI with Tailwind CSS

## Documentation Structure

- [Client Application](client.md) - React webview implementation
- [Server Logic](server.md) - Backend game mechanics and API
- [Shared Code](shared.md) - Common types and utilities
- [Game Mechanics](game-mechanics.md) - Scoring system and rules

## Getting Started

See the main README.md for setup instructions and development workflow.