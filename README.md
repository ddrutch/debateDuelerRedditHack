# Debate Dueler

A revolutionary competitive trivia game built for Reddit that combines traditional quiz gameplay with innovative social scoring mechanics. Players compete in real-time while their answers shape the community's collective wisdom, creating dynamic and evolving challenges.

## 🎮 What is Debate Dueler?

Debate Dueler is an interactive quiz game where strategy meets social dynamics. Unlike traditional trivia, your score depends not just on correctness, but on how your answers relate to the community's choices. Each game creates a unique competitive environment where players must balance knowledge, timing, and social prediction.

### Three Scoring Modes

**🏆 Contrarian Mode**
- Score higher by choosing less popular answers
- Perfect for risk-takers who enjoy going against the crowd
- Strategy: Predict what the minority will choose

**🤝 Conformist Mode**
- Score higher by choosing more popular answers
- Ideal for players who follow community trends
- Strategy: Wait for consensus and join the majority

**🎯 Trivia Mode**
- Traditional scoring based on correct answers
- Pure knowledge-based competition
- Strategy: Accuracy and speed matter most

## 🚀 Key Features

- **Real-time Competition**: Live leaderboards and community statistics
- **Multiple Question Types**: Multiple choice and sequence-based questions
- **Community Content**: Players can submit their own questions
- **Cross-platform**: Seamless experience on Reddit web and mobile
- **Admin Panel**: Moderators can manage game content
- **Persistent Scoring**: Your answers contribute to future games
- **Time Pressure**: Strategic timing with bonus points for speed

## 🏗️ Architecture

The application is built with modern web technologies:

- **Frontend**: React with TypeScript, running in Reddit webviews
- **Backend**: Express.js server with Redis for data persistence
- **Platform**: Reddit's Devvit framework for seamless integration
- **Styling**: Tailwind CSS for responsive, modern UI

## 🎲 How to Play

1. **Choose Your Mode**: Select Contrarian, Conformist, or Trivia
2. **Answer Questions**: Respond within the time limit (usually 20 seconds)
3. **Watch the Community**: See live statistics as others answer
4. **Score Points**: Earn based on your mode's strategy
5. **Climb Leaderboards**: Compete for the top spot

### Example Gameplay

**Question**: "Which animal would win in a fight?"
- 🐻 Grizzly Bear
- 🐅 Siberian Tiger
- 🐘 African Elephant
- 🦏 White Rhino

**Contrarian Strategy**: If 80% choose Tiger, pick Bear for higher score
**Conformist Strategy**: Choose Tiger to match the crowd
**Trivia Strategy**: Choose the "correct" answer regardless of popularity

## 🛠️ Development

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

### Commands

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run deploy`: Deploy to Reddit
- `npm run check`: Run type checking and linting

## 📚 Documentation

- [Source Code Documentation](docs/) - Technical implementation details
- [Game Mechanics](docs/game-mechanics.md) - Detailed rules and strategies
- [Client Architecture](docs/client.md) - Frontend implementation
- [Server Architecture](docs/server.md) - Backend systems
- [Shared Code](docs/shared.md) - Common utilities and types

## 🎨 Game Design Philosophy

Debate Dueler challenges traditional game design by making social dynamics a core mechanic. Your success depends on understanding not just the questions, but the psychology of the community. This creates replayability and strategic depth that traditional trivia games lack.

### Social Dynamics

- **Community Learning**: Each answer contributes to collective knowledge
- **Dynamic Difficulty**: Questions evolve based on community responses
- **Strategic Depth**: Multiple viable strategies for different play styles
- **Live Competition**: Real-time feedback and leaderboards

## 🤝 Contributing

We welcome contributions! Whether it's:

- Adding new question decks
- Improving the scoring algorithms
- Enhancing the UI/UX
- Reporting bugs
- Suggesting new features

See our [development documentation](docs/) for technical details.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

Built with ❤️ using:
- [Devvit](https://developers.reddit.com/) - Reddit's developer platform
- [React](https://react.dev/) - UI framework
- [Express](https://expressjs.com/) - Backend framework
- [Redis](https://redis.io/) - Data persistence
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

**Ready to duel?** Visit any Debate Dueler post on Reddit and start competing!
