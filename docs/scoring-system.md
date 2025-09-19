# Scoring System Documentation

This document details the scoring mechanics and algorithms that power Debate Dueler's unique gameplay experience.

## Overview

Debate Dueler features three distinct scoring modes that create different strategic gameplay experiences:

- **Contrarian**: Score higher by choosing less popular answers
- **Conformist**: Score higher by choosing more popular answers
- **Trivia**: Traditional scoring based on correct answers

## Core Scoring Formula

All scoring modes follow this base formula:

```
Final Score = Base Score + Time Bonus
```

Where:
- **Base Score**: 0-100 points based on answer quality
- **Time Bonus**: Remaining time in seconds (max 20)

## Scoring Mode Details

### 1. Contrarian Mode

**Strategy**: Go against the crowd. Unpopular answers score higher.

**Algorithm**:
```typescript
const popularity = questionStats.cardStats[cardId] / questionStats.totalResponses;
const contrarianScore = (1 - popularity) * 100;
return Math.round(contrarianScore) + timeRemaining;
```

**Examples**:
- If 90% of players chose Answer A: Answer A scores ~10 points
- If 10% of players chose Answer B: Answer B scores ~90 points
- If 50% chose each: Both score ~50 points

**Gameplay Implications**:
- Rewards unique perspectives and contrarian thinking
- Encourages players to think differently from the crowd
- Creates "maverick" gameplay style
- Higher risk/reward ratio

### 2. Conformist Mode

**Strategy**: Follow the crowd. Popular answers score higher.

**Algorithm**:
```typescript
const popularity = questionStats.cardStats[cardId] / questionStats.totalResponses;
const conformistScore = popularity * 100;
return Math.round(conformistScore) + timeRemaining;
```

**Examples**:
- If 90% of players chose Answer A: Answer A scores ~90 points
- If 10% of players chose Answer B: Answer B scores ~10 points
- If 50% chose each: Both score ~50 points

**Gameplay Implications**:
- Rewards consensus and popular opinion
- Encourages players to predict crowd behavior
- Creates "bandwagon" gameplay style
- Lower risk, more predictable scoring

### 3. Trivia Mode

**Strategy**: Get the right answer. Only correct answers score points.

**Algorithm**:
```typescript
const card = question.cards.find(c => c.id === cardId);
const isCorrect = card?.isCorrect || false;
return isCorrect ? 100 + timeRemaining : 0;
```

**Examples**:
- Correct answer: 100 + time remaining (max 120 points)
- Incorrect answer: 0 points
- No partial credit for close answers

**Gameplay Implications**:
- Traditional quiz game experience
- Pure knowledge-based scoring
- High stakes - all or nothing
- Clear right/wrong feedback

## Sequence Question Scoring

Sequence questions add complexity with position-based scoring.

### Trivia Mode (Sequence)
```typescript
const correctSequence = question.cards
  .filter(c => c.sequenceOrder !== undefined)
  .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
  .map(c => c.id);

let correctPositions = 0;
playerSequence.forEach((cardId, index) => {
  if (correctSequence[index] === cardId) correctPositions++;
});

const accuracy = correctPositions / correctSequence.length;
return Math.round(accuracy * 100) + timeRemaining;
```

**Scoring**: Percentage of items in correct position
- 3/3 correct positions: 100 + time bonus
- 2/3 correct positions: ~67 + time bonus
- 1/3 correct positions: ~33 + time bonus
- 0/3 correct positions: 0 + time bonus

### Community-Based Sequence Scoring

For Contrarian and Conformist modes with sequences:

```typescript
let totalPct = 0;
sequence.forEach((cardId, index) => {
  const positionCount = questionStats.positionStats[cardId]?.[index + 1] || 0;
  const positionTotal = questionStats.totalResponses;
  const positionPct = positionTotal > 0 ? (positionCount / positionTotal) * 100 : 0;
  totalPct += positionPct;
});

const averagePct = totalPct / sequence.length;

if (scoringMode === 'conformist') {
  return Math.round(averagePct) + timeRemaining;
} else { // contrarian
  return Math.round(100 - averagePct) + timeRemaining;
}
```

**Position Tracking**: Each card's placement in each position is tracked separately
- Card A in position 1: tracked independently from Card A in position 2
- Allows for nuanced community preferences

## Time Bonus System

### Base Time Bonus
```typescript
const timeBonus = Math.max(0, timeRemaining);
```

**Mechanics**:
- Maximum bonus: 20 points (full time remaining)
- Minimum bonus: 0 points (time expired)
- Linear scaling with remaining seconds
- Applied to all scoring modes equally

**Strategic Implications**:
- Encourages faster thinking and decision-making
- Rewards efficiency and confidence
- Creates time pressure gameplay
- Balances speed vs accuracy trade-offs

## Statistics Tracking

### Real-time Statistics Updates

**Multiple Choice Questions**:
```typescript
// Update card popularity
questionStats.cardStats[cardId] = (questionStats.cardStats[cardId] || 0) + 1;
questionStats.totalResponses++;

// Calculate percentage
const percentage = (questionStats.cardStats[cardId] / questionStats.totalResponses) * 100;
```

**Sequence Questions**:
```typescript
// Update both general and position-specific stats
questionStats.cardStats[cardId] = (questionStats.cardStats[cardId] || 0) + 1;

// Position tracking (1-based indexing)
if (!questionStats.positionStats[cardId]) {
  questionStats.positionStats[cardId] = {};
}
questionStats.positionStats[cardId][position] =
  (questionStats.positionStats[cardId][position] || 0) + 1;
```

### Community Learning Effect

As more players answer, statistics become more accurate:
- Early players: Limited data, higher variance in scoring
- Later players: Rich community data, more predictable scoring
- Creates dynamic gameplay that evolves over time

## Visual Feedback System

### Color Coding

**Contrarian Mode**:
```typescript
// Red (unpopular) to Green (popular) gradient
const hue = 120 * (percentage / 100);
backgroundColor: `hsla(${hue}, 70%, 30%, 0.8)`
```

**Conformist Mode**:
```typescript
// Green (popular) to Red (unpopular) gradient
const hue = 120 * (1 - (percentage / 100));
backgroundColor: `hsla(${hue}, 70%, 30%, 0.8)`
```

**Trivia Mode**:
```typescript
// Binary feedback
backgroundColor: isCorrect ? 'rgba(0, 100, 0, 0.7)' : 'rgba(100, 0, 0, 0.7)'
```

### Sequence Position Indicators

For sequence questions, each position shows:
- Individual card popularity in that position
- Color coding based on scoring mode
- Percentage of community that placed the card there

## Scoring Edge Cases

### No Community Data
When no one has answered yet:
- All answers treated as 50% popularity
- Neutral scoring across all modes
- Time bonus still applies

### Single Player
First player to answer:
- No community statistics available
- Fallback to neutral scoring
- Establishes baseline for future players

### Tied Popularities
When multiple answers have equal popularity:
- All tied answers receive same base score
- Time bonus differentiates players
- Encourages speed over analysis

## Anti-Cheating Measures

### Server-Side Validation
- All client-calculated scores validated on server
- Authoritative scoring using server statistics
- Prevents score manipulation

### Timing Validation
- Server tracks question display times
- Validates time remaining claims
- Prevents artificial time bonus inflation

### Statistics Integrity
- Atomic Redis operations for statistics updates
- Race condition protection
- Consistent data across concurrent players

## Performance Considerations

### Real-time Updates
- Statistics calculated incrementally
- Cached percentages to reduce computation
- Efficient Redis data structures

### Memory Management
- Bounded leaderboard sizes
- Automatic cleanup of old statistics
- Optimized data serialization

### Scalability
- Horizontal scaling through Redis clustering
- Asynchronous statistics updates
- Load balancing for concurrent games

## Testing and Balancing

### Score Distribution Analysis
- Monitor scoring variance across modes
- Adjust algorithms for desired difficulty curves
- Balance time pressure vs thinking time

### Player Experience Metrics
- Track player engagement by scoring mode
- Monitor completion rates and satisfaction
- Adjust scoring weights based on feedback

### Algorithm Iteration
- A/B testing different scoring formulas
- Community feedback integration
- Continuous balancing based on player behavior

## Future Enhancements

### Advanced Scoring Modes
- **Hybrid Mode**: Combination of multiple scoring strategies
- **Time-weighted**: Earlier answers worth more points
- **Streak Bonus**: Consecutive correct answers multiplier

### Dynamic Difficulty
- Adaptive scoring based on player skill level
- Question difficulty weighting
- Personalized challenge levels

### Social Features
- Friend comparisons and challenges
- Team-based scoring modes
- Tournament and competition systems

## Mathematical Foundations

### Probability Theory
Scoring modes leverage community behavior patterns:
- **Central Limit Theorem**: Large player samples create predictable distributions
- **Bayesian Updating**: Statistics improve with more data
- **Game Theory**: Players must predict others' behavior

### Statistical Analysis
- **Percentile Rankings**: Position within community distribution
- **Standard Deviation**: Measuring consensus vs disagreement
- **Correlation Analysis**: Answer relationships and patterns

This scoring system creates a unique blend of knowledge, psychology, and strategy that makes Debate Dueler engaging and replayable.