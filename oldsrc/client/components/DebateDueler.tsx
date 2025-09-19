import React, { useState, useEffect, useCallback } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { GameScreen } from './GameScreen';
import { ResultsScreen } from './ResultsScreen';
import { AdminScreen } from './adminScreen'; // Import the new AdminScreen
import { useDevvitListener } from '../hooks/useDevvitListener';
import { sendToDevvit } from '../utils';

import { 
  ScoringMode, 
  Deck, 
  PlayerSession, 
  PlayerAnswer,
  Question,
  QuestionStats
} from '../../shared/types/redditTypes';

const calculateLocalScore = (
  answers: PlayerAnswer[],
  question: Question,
  questionStats: QuestionStats,
  scoringMode: ScoringMode
) => {
  const answer = answers.find(a => a.questionId === question.id);
  if (!answer) return 0;

  const baseTimeBonus = Math.max(0, answer.timeRemaining);

  if (question.questionType === 'sequence') {
    const sequence = answer.answer as string[];

    if (scoringMode === 'trivia') {
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
      if (!questionStats.positionStats) return 0;

      let totalPct = 0;
      sequence.forEach((cardId, index) => {
        const positionCount = questionStats.positionStats?.[cardId]?.[index] || 0;
        const positionTotal = questionStats.totalResponses;
        const positionPct = positionTotal > 0 ? (positionCount / positionTotal) * 100 : 0;
        totalPct += positionPct;
      });

      const averagePct = totalPct / sequence.length;

      if (scoringMode === 'conformist') {
        return Math.round(averagePct) + baseTimeBonus;
      } else {
        return Math.round(100 - averagePct) + baseTimeBonus;
      }
    }
  } else {
    const cardId = answer.answer as string;
    if (scoringMode === 'trivia') {
      const card = question.cards.find(c => c.id === cardId);
      return card?.isCorrect ? 100 + baseTimeBonus : 0;
    }
    
    const count = questionStats.cardStats[cardId] || 0;
    const popularity = questionStats.totalResponses > 0 ? (count / questionStats.totalResponses) : 0;

    if (scoringMode === 'contrarian') {
      return Math.round((1 - popularity) * 100) + baseTimeBonus;
    } else {
      return Math.round(popularity * 100) + baseTimeBonus;
    }
  }
};

type GamePhase = 'welcome' | 'playing' | 'results' | 'admin'; // Add 'admin' phase

export const DebateDueler: React.FC = () => {
  const LOCAL_STORAGE_KEY = 'debateDuelerState';
  const [gamePhase, setGamePhase] = useState<GamePhase>('welcome');
  const [deck, setDeck] = useState<Deck | null>(null);
  const [playerSession, setPlayerSession] = useState<PlayerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // New state for admin status

  // Local storage for answers during gameplay
  const [localAnswers, setLocalAnswers] = useState<PlayerAnswer[]>([]);
  const [localScore, setLocalScore] = useState<number>(0);

  // Listen for INIT_RESPONSE from Devvit
  const initResponse = useDevvitListener('INIT_RESPONSE');
  const savedData = useDevvitListener('CONFIRM_SAVE_PLAYER_DATA');
  const playerDataListener = useDevvitListener("GIVE_POST_DATA")



  useEffect(() => {
    if (savedData) {  
      console.log("Saved data confirmation received:", savedData);
      if (savedData.isSaved) {
        console.log("Player data successfully saved.");
      } else {
        console.error("Failed to save player data.");
      }
    }
  }, [savedData]);

  useEffect(() => {
    if (playerDataListener) {
      setError(null);
      console.log("REFRESHED DATA RECEIVED", playerDataListener);
      handleRefreshedData(playerDataListener);
    }
  }, [playerDataListener]);

  useEffect(() => {
    if (initResponse) {
      setError(null);
      console.log("INIT RESPONSE RECEIVED", initResponse);
      handleInitResponse(initResponse);
    } else {
      console.log("NO INIT RESPONSE YET");
      // Send INIT request if we haven't received a response
      sendToDevvit({ type: 'INIT' });
    }
  }, [initResponse]);

  // New handler for refreshed data (won't change game phase)
  const handleRefreshedData = (payload: any) => {
    try {
      if (!payload || !payload.deck) {
        throw new Error('Invalid refresh data');
      }
      
      console.log("Refreshed data received", payload);
      
      // Only update deck and player session
      setDeck(payload.deck);
      setPlayerSession(payload.playerSession);
      setIsAdmin(payload.isAdmin || false); // Update isAdmin status
    } catch (err) {
      console.error('Failed to process refresh data:', err);
    }
  };

  
  const handleInitResponse = (payload: any) => {
    try {
      if (!payload || !payload.deck) {
        throw new Error('Invalid initialization data');
      }
      console.log("player rank extracted: ", payload.playerRank);
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      let useSavedState = false;
      
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          if (payload.deck.id === parsedState.deckId) {
            useSavedState = true;
            setGamePhase(parsedState.gamePhase);
            setPlayerSession(parsedState.playerSession);
            setLocalAnswers(parsedState.localAnswers);
            setLocalScore(parsedState.localScore);
          } else {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }
        } catch (e) {
          console.error('Error parsing saved state:', e);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      }
      setDeck(payload.deck);
      setIsAdmin(payload.isAdmin || false); // Set isAdmin status from init response
      
      if (!useSavedState) {
        // Use session from payload if available
        if (payload.playerSession) {
          setPlayerSession(payload.playerSession);
          if (payload.playerSession.gameState === 'finished') {
            setGamePhase('results');
          } else if (payload.playerSession.gameState === 'playing') {
            setGamePhase('playing');
            setLocalAnswers(payload.playerSession.answers || []);
            setLocalScore(payload.playerSession.totalScore || 0);
          }
        } else {
          // No session - show welcome screen
          setGamePhase('welcome');
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to process init response:', err);
      setError('Failed to load game. Please refresh and try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gamePhase === 'playing' && playerSession && deck) {
      const stateToSave = {
        gamePhase,
        deckId: deck.id,
        playerSession,
        localAnswers,
        localScore,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [gamePhase, playerSession, deck, localAnswers, localScore]);

  useEffect(() => {
    if (gamePhase === 'results') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      clearTimerStorage();
    }
  }, [gamePhase]);

  const clearTimerStorage = () => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('debateTimer_')) {
        localStorage.removeItem(key);
      }
    }
  };

  const startGame = useCallback(async (scoringMode: ScoringMode) => {
    if (!deck) return;
    
    setLoading(true);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      
      // Create a new player session locally
      const newSession: PlayerSession = {
        userId: initResponse?.userId || 'unknown',
        username: initResponse?.username || 'Player',
        scoringMode,
        answers: [],
        totalScore: 0,
        currentQuestionIndex: 0,
        gameState: 'playing',
        startedAt: Date.now()
      };
      
      setPlayerSession(newSession);
      setLocalAnswers([]);
      setLocalScore(0);
      setGamePhase('playing');
    } catch (err) {
      console.error('Failed to start game:', err);
      setError('Failed to start game. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [deck, initResponse]);

  // Local answer processing - no Redis calls during gameplay
  const submitAnswer = useCallback(async (answer: string | string[], timeRemaining: number) => {
    if (!playerSession || !deck) return;
    const currentQuestion = deck.questions[playerSession.currentQuestionIndex];
    if (!currentQuestion) return;

    try {
      // Create answer record locally
      const answerRecord: PlayerAnswer = {
        questionId: currentQuestion.id,
        answer,
        timeRemaining,
        timestamp: Date.now(),
      };
      
      const questionStats = deck.questionStats?.find(s => s.questionId === currentQuestion.id);

      // NEW: Calculate score using the unified function
      const questionScore = calculateLocalScore(
        [...localAnswers, answerRecord],
        currentQuestion,
        questionStats || { questionId: currentQuestion.id, cardStats: {}, totalResponses: 0 },
        playerSession.scoringMode
      );
      
      // Update local state
      const newLocalAnswers = [...localAnswers, answerRecord];
      const newLocalScore = localScore + questionScore;
      
      setLocalAnswers(newLocalAnswers);
      setLocalScore(newLocalScore);

      // Check if game is complete
      const isGameComplete = playerSession.currentQuestionIndex >= deck.questions.length - 1;

      const result = {
        status: 'success' as const,
        score: questionScore,
        questionStats: {
          questionId: currentQuestion.id,
          cardStats: {},        // replace with real counts if you have them
          totalResponses: 0,    // same here
        },
        isGameComplete,
        ...(isGameComplete ? {} : { nextQuestionIndex: playerSession.currentQuestionIndex + 1 }),
      };
   
      if (isGameComplete) {
        // Game complete - send all data to server at once
        await submitFinalResults(newLocalAnswers, newLocalScore);
        setTimeout(() => {
          setGamePhase('results');
        }, 3500);
      } else {
        // Move to next question locally
        setPlayerSession(prev => prev ? {
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
          answers: newLocalAnswers,
          totalScore: newLocalScore,
        } : null);
        
      }
      return result
      ;
    } catch (err) {
      console.error('Failed to process answer:', err);
      setError('Failed to process answer. Please try again.');
    }
  }, [playerSession, deck, localAnswers, localScore]);


  const submitFinalResults = useCallback(async (myAnswers: PlayerAnswer[], myTotalScore: number) => {
    if (!playerSession) return;

    try {
      sendToDevvit({ type: 'COMPLETE_GAME',  
        payload: { answers : myAnswers, totalScore : myTotalScore , sessionData: playerSession } 
      })

      clearTimerStorage();
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    
      // Update session to finished state
      setPlayerSession(prev => prev ? {
        ...prev,
        myAnswers,
        myTotalScore,
        gameState: 'finished' as const,
        finishedAt: Date.now(),
      } : null);
      
    } catch (err) {
      console.error('Failed to submit final results:', err);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      clearTimerStorage();
    }
  }, [playerSession, sendToDevvit]);

  const restartGame = useCallback(() => {
    sendToDevvit( {type: 'GET_POST_DATA'})
    clearTimerStorage();
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setPlayerSession(null);
    //setCurrentQuestionStats(null);
    setLocalAnswers([]);
    setLocalScore(0);
    setGamePhase('welcome');
    setError(null);
  }, [sendToDevvit]);

  // Function to navigate to admin screen
  const goToAdminScreen = useCallback(() => {
    setGamePhase('admin');
  }, []);

  // Function to go back to results from admin screen
  const backToResults = useCallback(() => {
    sendToDevvit({ type: 'GET_POST_DATA' }); // Refresh data after admin changes
    setGamePhase('results');
  }, [sendToDevvit]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Debate Dueler ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center max-w-md">
          <h2 className="text-white text-xl font-bold mb-4">Oops!</h2>
          <p className="text-white/90 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-white text-lg">No game data available.</p>
      </div>
    );
  }


  const displaySession = playerSession ? {
    ...playerSession,
    answers: localAnswers,
    totalScore: localScore,
  } : null;

  switch (gamePhase) {
    case 'welcome':
      return (
        <WelcomeScreen
          deck={deck}
          onStartGame={startGame}
          existingSession={playerSession}
        />
      );
    
    case 'playing':
      return (
        <GameScreen
          deck={deck}
          playerSession={displaySession!}
          onSubmitAnswer={submitAnswer}
        />
      );
    
    case 'results':
      return (
        <ResultsScreen
          deck={deck}
          playerSession={displaySession!}
          onRestartGame={restartGame}
          onGoToAdminScreen={goToAdminScreen} 
          isAdmin={isAdmin} 
        />
      );
    case 'admin': 
      return (
        <AdminScreen
          deck={deck}
          playerSession={displaySession!}
          onBackToResults={backToResults}
          isAdmin = {isAdmin}
        />
      );
    
    default:
      return null;
  }
};
