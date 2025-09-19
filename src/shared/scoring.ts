import { ScoringMode, QuestionStats, Question } from './types/game';

export const calculateScore = ({
  scoringMode,
  question,
  answer,
  questionStats,
  timeRemaining,
}: {
  scoringMode: ScoringMode;
  question: Question;
  answer: string | string[];
  questionStats: QuestionStats;
  timeRemaining: number;
}): number => {
  const baseTimeBonus = Math.max(0, timeRemaining); // 1 point per second remaining

  // Helper function to get card percentage
  const getCardPercentage = (cardId: string): number => {
    if (!questionStats || questionStats.totalResponses === 0) return 0;
    const count = questionStats.cardStats[cardId] || 0;
    return Math.round((count / questionStats.totalResponses) * 100);
  };

  // Handle sequence questions
  if (question.questionType === 'sequence') {
    const sequence = answer as string[];

    if (scoringMode === 'trivia') {
      // For trivia, compare to correct sequence
      const correctSequence = question.cards
        .filter(c => c.sequenceOrder !== undefined)
        .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
        .map(c => c.id);

      let correctPositions = 0;
      sequence.forEach((cardId, index) => {
        if (index < correctSequence.length && correctSequence[index] === cardId) {
          correctPositions++;
        }
      });

      const accuracy = correctPositions / correctSequence.length;
      return Math.round(accuracy * 100) + baseTimeBonus;
    } else {
      // For conformist/contrarian, calculate popularity score
      let totalPct = 0;
      sequence.forEach(cardId => {
        totalPct += getCardPercentage(cardId);
      });

      const averagePct = totalPct / sequence.length;

      if (scoringMode === 'conformist') {
        return Math.round(averagePct) + baseTimeBonus;
      } else {
        return Math.round(100 - averagePct) + baseTimeBonus;
      }
    }
  } else {
    // Handle multiple choice questions
    const cardId = answer as string;

    if (scoringMode === 'trivia') {
      const card = question.cards.find(c => c.id === cardId);
      return card?.isCorrect ? 100 + baseTimeBonus : 0;
    }

    const popularity = getCardPercentage(cardId) / 100;

    if (scoringMode === 'contrarian') {
      return Math.round((1 - popularity) * 100) + baseTimeBonus;
    } else {
      return Math.round(popularity * 100) + baseTimeBonus;
    }
  }
};