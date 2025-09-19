import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnswerCards } from './AnswerCards';
import { LiveBackground } from './LiveBackground';
import { 
  Deck, 
  PlayerSession, 
  QuestionStats, 
  SubmitAnswerResponse,
  Question,
} from '../../shared/types/redditTypes';

interface GameScreenProps {
  deck: Deck;
  playerSession: PlayerSession;
  onSubmitAnswer: (answer: string | string[], timeRemaining: number) => Promise<SubmitAnswerResponse | undefined>;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  deck,
  playerSession,
  onSubmitAnswer,

}) => {
  
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [lastScore, setLastScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentQuestion = deck.questions[playerSession.currentQuestionIndex]!;
  const isLastQuestion = playerSession.currentQuestionIndex >= deck.questions.length - 1;
  const ANSWER_DISPLAY_MS = 3500;
  const [sequenceOrder, setSequenceOrder] = useState<Record<string, number>>({});
  const [answeredSequenceOrder, setAnsweredSequenceOrder] = useState<Record<string, number>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [answeredQuestion, setAnsweredQuestion] = useState<Question | null>(null);
  const [answeredQuestionIndex, setAnsweredQuestionIndex] = useState(-1);
  const [displayedTotalScore, setDisplayedTotalScore] = useState(playerSession.totalScore);
  const [countdownProgress, setCountdownProgress] = useState(0);
  const total = deck.questions.length;
  const [progressOnResult, setProgressOnResult] = useState(0);
  const TIMER_STORAGE_KEY = `debateTimer_${deck.id}_${playerSession.currentQuestionIndex}`;
 
  const displayQuestion = showResults ? answeredQuestion : deck.questions[playerSession.currentQuestionIndex];
  const displayQuestionIndex = showResults ? answeredQuestionIndex : playerSession.currentQuestionIndex;
  const [isQuestionExpanded, setIsQuestionExpanded] = useState(false);

  const getCurrentQuestionStats = (): QuestionStats | null => {
    if (!deck.questionStats || !displayQuestion) return null;
    return deck.questionStats.find(stats => 
      stats.questionId === displayQuestion.id
    ) || null;
  };

  // Sequence selection handler - tracks order
  const handleSequenceSelect = (cardId: string) => {
    if (showResults || isSubmitting) return;

    // If card already selected, remove it
    if (sequenceOrder[cardId]) {
      const newOrder = {...sequenceOrder};
      delete newOrder[cardId];
      
      // Reorder remaining cards
      const ordered = Object.entries(newOrder)
        .sort((a, b) => a[1] - b[1])
        .map(([id], i) => [id, i + 1]);
      
      setSequenceOrder(Object.fromEntries(ordered));
      return;
    }
    
    // Add new card to sequence
    const currentIndex = Object.keys(sequenceOrder).length + 1;
    setSequenceOrder(prev => ({
      ...prev,
      [cardId]: currentIndex
    }));
  };

  // Submit sequence answer
  const submitSequence = () => {
    // Convert order mapping to sorted array
    const sequence = Object.entries(sequenceOrder)
      .sort((a, b) => a[1] - b[1])
      .map(([cardId]) => cardId);
    
    handleSubmitAnswer(sequence, timeRemaining);
  };

  // Submit handler
  const handleSubmitAnswer = useCallback(async (answer: string | string[], timeLeft: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const justAnsweredIndex = playerSession.currentQuestionIndex;
    const newProgress = ((justAnsweredIndex + 1) / total) * 100;
    setProgressOnResult(newProgress);
    const result = await onSubmitAnswer(answer, timeLeft);

    localStorage.removeItem(TIMER_STORAGE_KEY);
    
    if (result?.status === "success") {
      if (currentQuestion) {
        setAnsweredQuestion(currentQuestion);
      }
      setAnsweredQuestionIndex(playerSession.currentQuestionIndex);
      setLastScore(result.score);
      setShowResults(true);

      // Store sequence order for results display, then reset for next question
      if (Array.isArray(answer)) {
        // Reconstruct sequence order from the answer array
        const reconstructedOrder: Record<string, number> = {};
        answer.forEach((cardId, index) => {
          reconstructedOrder[cardId] = index + 1;
        });
        setAnsweredSequenceOrder(reconstructedOrder);
        setSequenceOrder({});
      }
      
      setTimeout(() => {
        if (!result.isGameComplete) {
          setShowResults(false);
          setSelectedCardId(null);
          setIsSubmitting(false);
        }
      }, ANSWER_DISPLAY_MS);
    } else {
      setIsSubmitting(false);
    }
  }, [onSubmitAnswer, isSubmitting, currentQuestion, playerSession]);

  const getCardPercentage = (cardId: string): number => {
      const stats = getCurrentQuestionStats();
      if (!stats || stats.totalResponses === 0) return 0;
      const count = stats.cardStats[cardId] || 0;
      return Math.round((count / stats.totalResponses) * 100);
  };

  const getCardCorrect = (cardId: string): boolean => {
    if (!displayQuestion) return false;
    return !!displayQuestion.cards.find(c => c.id === cardId && c.isCorrect);
  }

  // Position-based helper functions for sequence questions
  const getPositionPercentage = (cardId: string, position: number): number => {
    const stats = getCurrentQuestionStats();
    if (!stats?.positionStats || stats.totalResponses === 0) return 0;
    
    const count = stats.positionStats[cardId]?.[position] || 0;
    return Math.round((count / stats.totalResponses) * 100);
  };

  const getPositionTintStyle = (cardId: string, position: number) => {
    if (!showResults) return {};
    
    const stats = getCurrentQuestionStats();
    if (!stats?.positionStats) return {};
    
    // Get all cards with their percentages for this position
    const cardsWithPct = displayQuestion?.cards.map(card => ({
      id: card.id,
      pct: getPositionPercentage(card.id, position)
    })) || [];
    
    // Sort cards by percentage (high to low)
    cardsWithPct.sort((a, b) => b.pct - a.pct);
    
    // Find the rank of this card
    const rank = cardsWithPct.findIndex(c => c.id === cardId);
    
    // If we couldn't determine rank, use default
    if (rank === -1) return {};
    
    // Calculate position (0 = most popular, 1 = second, etc.)
    const positionRatio = rank / Math.max(1, cardsWithPct.length - 1);
    
    switch (playerSession.scoringMode) {
      case 'trivia':
        // For trivia, show green if this is the correct position, red if not
        const correctSequence = displayQuestion?.cards
          .filter(c => c.sequenceOrder !== undefined)
          .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
          .map(c => c.id) || [];
        
        const isCorrectPosition = correctSequence[position - 1] === cardId;
        return { 
          backgroundColor: isCorrectPosition 
            ? 'rgba(0, 100, 0, 0.7)'  // Dark green for correct
            : 'rgba(100, 0, 0, 0.7)'   // Dark red for incorrect
        };
        
      case 'conformist': {
        // Green to red gradient based on popularity rank
        // 0 = most popular (green), 1 = least popular (red)
        const hue = 120 * (1 - positionRatio);
        return { backgroundColor: `hsla(${hue}, 70%, 30%, 0.8)` };
      }
      
      case 'contrarian': {
        // Red to green gradient (opposite of conformist)
        // 0 = most popular (red), 1 = least popular (green)
        const hue = 120 * positionRatio;
        return { backgroundColor: `hsla(${hue}, 70%, 30%, 0.8)` };
      }
      
      default:
        return {};
    }
  };

  const getScoringModeIcon = () => {
    switch (playerSession.scoringMode) {
      case 'contrarian': return '🎭';
      case 'conformist': return '👥';
      case 'trivia': return '🧠';
      default: return '🎯';
    }
  };


  const getProgressPercentage = () => {
    if (showResults) {
      return progressOnResult;
    }
    return (playerSession.currentQuestionIndex / total) * 100;
  };

  const progressPercentage = getProgressPercentage();

  // Compute correct IDs
  const correctIds = useMemo(() => {
    if (!displayQuestion) return [];
    return displayQuestion.cards.filter(c => c.isCorrect).map(c => c.id);
  }, [displayQuestion]);


  // Determine tint style
const getTintStyle = (cardId: string) => {
  if (!showResults) return {};
  
  const stats = getCurrentQuestionStats();
  if (!stats) return {};
  
  // Get all cards with their percentages
  const cardsWithPct = displayQuestion?.cards.map(card => ({
    id: card.id,
    pct: getCardPercentage(card.id)
  })) || [];
  
  // Sort cards by percentage (high to low)
  cardsWithPct.sort((a, b) => b.pct - a.pct);
  
  // Find the rank of this card
  const rank = cardsWithPct.findIndex(c => c.id === cardId);
  
  // If we couldn't determine rank, use default
  if (rank === -1) return {};
  
  // Calculate position (0 = most popular, 1 = second, etc.)
  const position = rank / Math.max(1, cardsWithPct.length - 1);
  
  switch (playerSession.scoringMode) {
    case 'trivia':
      return { 
        backgroundColor: correctIds.includes(cardId) 
          ? 'rgba(0, 100, 0, 0.7)'  // Dark green for correct
          : 'rgba(100, 0, 0, 0.7)'   // Dark red for incorrect
      };
      
    case 'conformist': {
      // Green to red gradient based on popularity rank
      // 0 = most popular (green), 1 = least popular (red)
      const hue = 120 * (1 - position);
      return { backgroundColor: `hsla(${hue}, 70%, 30%, 0.8)` };
    }
    
    case 'contrarian': {
      // Red to green gradient (opposite of conformist)
      // 0 = most popular (red), 1 = least popular (green)
      const hue = 120 * position;
      return { backgroundColor: `hsla(${hue}, 70%, 30%, 0.8)` };
    }
    
    default:
      return {};
  }
};


  // Card select handler
  const handleCardSelect = (cardId: string) => {
    if (showResults || isSubmitting || !displayQuestion) return;
    
    if (displayQuestion.questionType === 'sequence') {
      handleSequenceSelect(cardId);
    } else {
      setSelectedCardId(cardId);
      handleSubmitAnswer(cardId, timeRemaining);
    }
  };

  
  // Timer effect
  useEffect(() => {
    if (showResults || !currentQuestion) return;
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    setTimeRemaining(currentQuestion.timeLimit);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          // Auto-submit if time runs out
          if (currentQuestion.questionType === 'sequence' && Object.keys(sequenceOrder).length > 0) {
            submitSequence();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        localStorage.setItem(TIMER_STORAGE_KEY, timeRemaining.toString());
      }
    };
  }, [currentQuestion, showResults]);

  // Animate score increase
  useEffect(() => {
    if (showResults) {
      const targetScore = playerSession.totalScore;
      const startScore = targetScore - lastScore;
      const duration = 750;
      const startTime = Date.now();
      
      const animateScore = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentScore = Math.floor(startScore + lastScore * progress);
        setDisplayedTotalScore(currentScore);
        
        if (progress < 1) {
          requestAnimationFrame(animateScore);
        }
      };
      
      requestAnimationFrame(animateScore);
    } else {
      setDisplayedTotalScore(playerSession.totalScore);
    }
  }, [playerSession.totalScore, showResults, lastScore]);

  // Countdown progress during answer display
  useEffect(() => {
    if (showResults && !isLastQuestion) {
      setCountdownProgress(0);
      const startTime = Date.now();
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / ANSWER_DISPLAY_MS, 1);
        setCountdownProgress(progress * 100);
        
        if (progress >= 1) {
          clearInterval(interval);
        }
      }, 50);
      
      return () => {
        clearInterval(interval);
        setCountdownProgress(0);
      };
    }
  }, [showResults, isLastQuestion]);



  // Calculate background properties based on game state
  const backgroundProps = useMemo(() => {
    if (!displayQuestion) {
      return { isActive: true };
    }

    const isContrarian = playerSession.scoringMode === 'contrarian';
    const isCorrect = selectedCardId ? getCardCorrect(selectedCardId) : false;
    const isTrivia = playerSession.scoringMode === 'trivia';
    const percentage = selectedCardId ? getCardPercentage(selectedCardId) : 0;
    
    let backgroundColor = '';

    if (selectedCardId) {
      if (isTrivia) {
        backgroundColor = isCorrect ? 'rgba(0, 100, 0, 0.7)' : 'rgba(100, 0, 0, 0.7)';
      } else {
        const hue = isContrarian 
          ? 120 * (percentage / 100) // red to green
          : 120 * (1 - (percentage / 100)); // green to red
        backgroundColor = `hsla(${hue}, 70%, 30%, 0.8)`;
      }
    }

    return { 
      isActive: true,
      showResults,
      glowColor: backgroundColor,
      percentage: percentage,
      isContrarian: isContrarian,
    };
  }, [displayQuestion, selectedCardId, showResults, playerSession.scoringMode]);

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* Live Background */}
      <LiveBackground {...backgroundProps} />
      {/* Top Bar */}
      <div className="flex justify-between items-center px-[clamp(.5rem,2vw,1rem)] py-[clamp(.25rem,1vw,.75rem)]">
        <div className="text-white">
          <div className="flex items-center space-x-[clamp(.25rem,1vw,.5rem)]">
            <span className="text-[clamp(1rem,3vw,1.5rem)]">{getScoringModeIcon()}</span>
            <span className="font-semibold capitalize text-[clamp(.75rem,2vw,1rem)]">
              {playerSession.scoringMode}
            </span>
          </div>
          <div className="text-[clamp(.5rem,1.5vw,.75rem)] opacity-75 mt-[clamp(.25rem,1vw,.5rem)]">
            Q{displayQuestionIndex + 1}/{deck.questions.length}
          </div>
        </div>
        <div className="text-white text-right">
          <div className="font-bold text-[clamp(1.25rem,4vw,2rem)]">{displayedTotalScore}</div>
          <div className="text-[clamp(.5rem,1.5vw,.75rem)] opacity-75">Total Score</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/20 h-[clamp(.25rem,.5vw,.5rem)] mb-[clamp(.5rem,1vw,1rem)]">
        <div
          className="bg-gradient-to-r from-pink-500 to-purple-600 h-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Timer */}
      {!showResults && (
        <div className="flex justify-center mb-[clamp(.5rem,1vw,1rem)]">
          <div
            className="flex items-center justify-center"
            style={{
              width: 'clamp(2rem,8vw,4rem)',
              height: 'clamp(2rem,8vw,4rem)'
            }}
          >
            <span
              className="font-bold text-[clamp(1rem,4vw,2rem)]"
              style={{ color: timeRemaining <= 5 ? '#f87171' : '#fff' }}
            >
              {timeRemaining}
            </span>
          </div>
        </div>
      )}

      {/* Question Area */}
      <div className="relative">
        <div 
          onClick={() => setIsQuestionExpanded(true)}
          className="relative cursor-pointer bg-white/10 backdrop-blur-sm rounded-xl p-[clamp(.5rem,2vw,1rem)] mx-[clamp(.5rem,2vw,1rem)] mb-[clamp(.5rem,1vw,1rem)] transition-all hover:bg-white/20"
          // Add these new Tailwind classes
          style={{
            maxHeight: '20vh', // Adjust this value as needed
            overflowY: 'hidden',
          }}
        >
          <h2 className="text-white font-bold text-center text-[clamp(1rem,2vw,1rem)] leading-tight">
            {displayQuestion?.prompt}
          </h2>
          {displayQuestion?.authorUsername && (
            <p className="text-blue-200 text-[clamp(.5rem,1.5vw,.75rem)] text-center mt-[clamp(.25rem,1vw,.5rem)]">
              by u/{displayQuestion?.authorUsername}
            </p>
          )}
          {/* The new animated cue */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-white/40 rounded-br-xl animate-pulse"
          />
        </div>
      </div>


      {/* Pop-up Overlay */}
      {isQuestionExpanded && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-opacity duration-300"
          onClick={() => setIsQuestionExpanded(false)}
        >
          {/* The text label */}
          <div className="absolute bottom-6 text-white/70 text-sm animate-pulse">
            Press anywhere to close
           </div>          
          <div 
            className="bg-white/10 rounded-xl pt-8 px-8 pb-4 max-w-2xl mx-auto shadow-lg border border-white/20 flex flex-col justify-between items-center h-full w-full max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main Question Text */}
            <div className="flex-grow overflow-y-auto w-full p-4">
              <h2 className="text-white font-bold text-center text-[clamp(1rem,4vw,2rem)] leading-tight mb-4">
                {displayQuestion?.prompt}
              </h2>
              {displayQuestion?.authorUsername && (
                <p className="text-blue-200 text-[clamp(.75rem,2vw,1.25rem)] text-center">by u/{displayQuestion?.authorUsername}</p>
              )}
            </div>
            {/* New Close Button with larger clickable area */}
            <div
              onClick={() => setIsQuestionExpanded(false)}
              className="w-24 h-8 flex items-center justify-center cursor-pointer mt-auto"
            >
              <div className="w-12 h-1 bg-white/50 rounded-full transition-all hover:bg-white" />
            </div>
          </div>
        </div>
      )}
  

      {/* Results Display */}
      {showResults && (
        <div className="relative bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-lg
                        p-[clamp(.5rem,2vw,1rem)] mx-[clamp(.5rem,2vw,1rem)] mb-[clamp(.5rem,1vw,1rem)]">
          <div className="text-center">
            <div className="font-bold text-[clamp(1.5rem,5vw,3rem)] text-white mb-[clamp(.25rem,1vw,.5rem)]">
              +{lastScore}
            </div>
            <div className="text-[clamp(.75rem,2vw,1.25rem)] text-green-200">
              {isLastQuestion ? 'Final Question Complete!' : 'Next question...'}
            </div>
            
            {!isLastQuestion && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-transparent rounded-b-lg overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full transition-all duration-100"
                  style={{ width: `${countdownProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Answer Cards */}
      <div
        className="
          flex-grow overflow-y-auto pb-[clamp(.5rem,1vw,1rem)]
          px-[clamp(.5rem,2vw,1rem)]
        "
      >
        <AnswerCards
          displayQuestion={displayQuestion!}
          playerSession={playerSession}
          selectedCardId={selectedCardId}
          showResults={showResults}
          isSubmitting={isSubmitting}
          sequenceOrder={sequenceOrder}
          answeredSequenceOrder={answeredSequenceOrder}
          handleSequenceSelect={handleSequenceSelect}
          submitSequence={submitSequence}
          handleCardSelect={handleCardSelect}
          getCardPercentage={getCardPercentage}
          getCardCorrect={getCardCorrect}
          getTintStyle={getTintStyle}
          getPositionPercentage={getPositionPercentage}
          getPositionTintStyle={getPositionTintStyle}
        />
      </div>

      {/* Bottom Status */}
      <div className="text-center p-[clamp(.25rem,1vw,.5rem)] bg-white/5">
        <p className="text-[clamp(.5rem,1.5vw,.75rem)] text-blue-200">
          {getCurrentQuestionStats() && getCurrentQuestionStats()!.totalResponses > 0
            ? `${getCurrentQuestionStats()!.totalResponses} players have answered`
            : 'Be the first to answer!'}
        </p>
      </div>
    </div>
  );
};