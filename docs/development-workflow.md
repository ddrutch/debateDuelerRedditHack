# Development Workflow Documentation

This document outlines the development workflow for Debate Dueler, including setup, testing, contribution guidelines, and best practices.

## Prerequisites

### System Requirements

- **Node.js**: Version 18.0 or higher
- **npm**: Latest stable version
- **Git**: Version 2.30 or higher
- **Reddit Account**: Developer account for app publishing
- **VS Code**: Recommended IDE with Devvit extension

### Development Environment Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/debate-dueler.git
cd debate-dueler

# 2. Install dependencies
npm install

# 3. Install Devvit CLI globally
npm install -g @devvit/cli

# 4. Login to Devvit
npx devvit login

# 5. Verify installation
npx devvit --version
```

## Project Structure

```
debate-dueler/
├── src/
│   ├── client/          # React webview application
│   ├── devvit/          # Reddit app backend
│   └── shared/          # Common types and utilities
├── docs/               # Documentation
├── package.json        # Project dependencies
├── devvit.yaml         # Devvit configuration
├── tsconfig.json       # TypeScript configuration
└── eslint.config.js    # Linting configuration
```

## Development Workflow

### 1. Local Development

#### Starting the Development Server

```bash
# Start both client and devvit development servers
npm run dev
```

This command:
- Starts the React development server on `http://localhost:5173`
- Launches Devvit playground for testing Reddit integration
- Enables hot reloading for both client and server code

#### Development URLs

- **React Client**: `http://localhost:5173`
- **Devvit Playground**: `https://devvit.reddit.com/playground`
- **Local Redis**: `redis://localhost:6379` (if running locally)

### 2. Code Changes

#### Client-Side Changes

```typescript
// Example: Adding a new component
// src/client/components/NewFeature.tsx
import React from 'react';

export const NewFeature: React.FC = () => {
  return (
    <div className="new-feature">
      <h2>New Feature</h2>
      {/* Component implementation */}
    </div>
  );
};
```

#### Server-Side Changes

```typescript
// Example: Adding a new Devvit handler
// src/devvit/main.tsx
Devvit.addCustomPostType({
  name: 'EnhancedDueler',
  // Enhanced post type implementation
});
```

#### Shared Type Changes

```typescript
// Example: Adding a new data type
// src/shared/types/game.ts
export type NewFeatureType = {
  id: string;
  name: string;
  enabled: boolean;
};
```

### 3. Testing

#### Unit Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

#### Test Structure

```typescript
// Example test file
// src/client/components/__tests__/GameScreen.test.tsx
import { render, screen } from '@testing-library/react';
import { GameScreen } from '../GameScreen';

describe('GameScreen', () => {
  it('renders question correctly', () => {
    render(<GameScreen deck={mockDeck} playerSession={mockSession} />);
    expect(screen.getByText('Sample Question')).toBeInTheDocument();
  });
});
```

#### Integration Testing

```typescript
// Example integration test
describe('Game Flow', () => {
  it('completes full game cycle', async () => {
    // Test complete game flow from start to finish
    // Verify scoring, leaderboard updates, etc.
  });
});
```

#### Manual Testing Checklist

- [ ] Game loads correctly in Devvit playground
- [ ] All scoring modes work as expected
- [ ] Leaderboard updates properly
- [ ] Admin features accessible to moderators
- [ ] Mobile responsiveness verified
- [ ] Error handling tested

### 4. Code Quality

#### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Check TypeScript types
npm run type-check
```

#### Code Formatting

```bash
# Format code with Prettier
npm run format

# Check formatting without changes
npm run format:check
```

#### Pre-commit Hooks

The project uses Husky for pre-commit quality checks:

```bash
# Pre-commit hooks run automatically:
# - ESLint validation
# - TypeScript type checking
# - Unit tests
# - Code formatting
```

## Contribution Guidelines

### Branching Strategy

```bash
# Create feature branch
git checkout -b feature/new-scoring-mode

# Create bug fix branch
git checkout -b bugfix/timer-issue

# Create documentation branch
git checkout -b docs/update-api-docs
```

#### Branch Naming Convention

- `feature/description`: New features
- `bugfix/description`: Bug fixes
- `hotfix/description`: Critical fixes
- `docs/description`: Documentation updates
- `refactor/description`: Code refactoring

### Commit Messages

Follow conventional commit format:

```bash
# Good commit messages
git commit -m "feat: add contrarian scoring mode"
git commit -m "fix: resolve timer countdown bug"
git commit -m "docs: update scoring system documentation"
git commit -m "refactor: optimize leaderboard queries"

# Bad commit messages
git commit -m "fixed stuff"
git commit -m "update"
git commit -m "changes"
```

### Pull Request Process

#### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots
If UI changes, add screenshots

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes
```

#### PR Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Code Review**: At least one maintainer review required
3. **Testing**: Reviewer tests changes in Devvit playground
4. **Approval**: PR approved and merged by maintainer

### Code Review Guidelines

#### For Reviewers

- **Functionality**: Does the code work as intended?
- **Code Quality**: Is the code clean, readable, and well-documented?
- **Testing**: Are there adequate tests?
- **Performance**: Any performance implications?
- **Security**: Any security concerns?

#### For Contributors

- **Address Feedback**: Respond to all review comments
- **Make Requested Changes**: Implement suggested improvements
- **Test Thoroughly**: Ensure changes don't break existing functionality
- **Update Documentation**: Keep docs in sync with code changes

## Best Practices

### TypeScript Guidelines

```typescript
// ✅ Good: Explicit types
interface GameProps {
  deck: Deck;
  playerSession: PlayerSession;
  onSubmitAnswer: (answer: string | string[]) => Promise<void>;
}

// ❌ Bad: Any types
interface GameProps {
  deck: any;
  playerSession: any;
  onSubmitAnswer: (answer: any) => any;
}
```

### React Best Practices

```typescript
// ✅ Good: Custom hooks for logic
const useGameState = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('welcome');
  // Game logic here
  return { gamePhase, setGamePhase };
};

// ✅ Good: Memoization for expensive operations
const questionStats = useMemo(() => {
  return calculateStats(deck.questions);
}, [deck.questions]);
```

### Performance Optimization

```typescript
// ✅ Good: Lazy loading
const AdminScreen = lazy(() => import('./AdminScreen'));

// ✅ Good: Bundle splitting
const routes = [
  {
    path: '/admin',
    component: AdminScreen,
    chunkName: 'admin'
  }
];
```

### Error Handling

```typescript
// ✅ Good: Comprehensive error handling
try {
  const result = await submitAnswer(answer);
  if (!result.success) {
    throw new Error(result.message);
  }
} catch (error) {
  console.error('Answer submission failed:', error);
  setError('Failed to submit answer. Please try again.');
}
```

## Debugging

### Client-Side Debugging

```typescript
// Debug message passing
const sendToDevvit = (message) => {
  console.log('Sending to Devvit:', message);
  window.parent.postMessage({
    type: 'devvit-message',
    data: { message }
  }, '*');
};
```

### Server-Side Debugging

```typescript
// Debug Redis operations
const debugRedis = async (key, value) => {
  console.log(`Redis ${key}:`, value);
  return await redis.set(key, JSON.stringify(value));
};
```

### Devvit Playground Debugging

1. Open Devvit playground
2. Check browser console for client errors
3. Check Devvit logs for server errors
4. Use Redux DevTools for state debugging

## Deployment

### Staging Deployment

```bash
# Deploy to staging environment
npm run deploy:staging

# Test in staging playground
# Verify all features work correctly
```

### Production Deployment

```bash
# Deploy to production
npm run deploy

# Monitor deployment status
npx devvit apps list

# Check app health
npx devvit apps logs <app-id>
```

## Troubleshooting

### Common Issues

#### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Devvit cache
npx devvit apps clear-cache
```

#### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# Restart Redis service
sudo systemctl restart redis

# Check Redis logs
tail -f /var/log/redis/redis-server.log
```

#### Devvit Authentication Issues

```bash
# Re-login to Devvit
npx devvit logout
npx devvit login

# Check authentication status
npx devvit whoami
```

### Getting Help

1. **Documentation**: Check this guide first
2. **Issues**: Search existing GitHub issues
3. **Discussions**: Use GitHub discussions for questions
4. **Community**: Join the Devvit Discord for real-time help

## Continuous Integration

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm run build
```

### Automated Testing

- **Unit Tests**: Run on every push
- **Integration Tests**: Run on pull requests
- **E2E Tests**: Run nightly
- **Performance Tests**: Run weekly

## Security Guidelines

### Code Security

- Never commit sensitive data (API keys, credentials)
- Use environment variables for configuration
- Validate all user inputs
- Implement proper authentication checks

### Dependency Management

```bash
# Check for vulnerabilities
npm audit

# Update dependencies safely
npm update

# Check outdated packages
npm outdated
```

### Access Control

- Admin features require proper permission checks
- User data is properly sanitized
- Rate limiting implemented for API endpoints
- Audit logging for sensitive operations

This development workflow ensures high-quality, maintainable code while enabling efficient collaboration across the Debate Dueler development team.