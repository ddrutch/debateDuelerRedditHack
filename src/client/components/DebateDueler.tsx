import React, { useState, useEffect, useCallback } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { GameScreen } from './GameScreen';
import { ResultsScreen } from './ResultsScreen';
import { AdminScreen } from './adminScreen'; // Import the new AdminScreen
import { LiveBackground } from './LiveBackground';
import { api, CompleteGameResponse } from '../api';

import {
  ScoringMode,
  Deck,
  PlayerSession,
  PlayerAnswer,
  Question,
  QuestionStats
} from '../../shared/types/game';
import { calculateScore } from '../../shared/scoring';


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

  // State for API responses
  const [initResponse, setInitResponse] = useState<any>(null);
  const [savedData, setSavedData] = useState<any>(null);
  const [playerDataListener, setPlayerDataListener] = useState<any>(null);
  const [leaderboardUpdated, setLeaderboardUpdated] = useState<boolean>(true);
  const [finalScore, setFinalScore] = useState<number>(0);



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
    const initializeApp = async () => {
      try {
        console.log("INITIALIZING APP");
        const response = await api.init();
        setInitResponse(response);
        setError(null);
        console.log("INIT RESPONSE RECEIVED", response);
        handleInitResponse(response);
      } catch (error) {
        console.error("Failed to initialize:", error);
        setError("Failed to load game data");
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

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

      // Update local question stats first to simulate server recording
      if (!deck.questionStats) deck.questionStats = [];
      let localQuestionStats = deck.questionStats.find(s => s.questionId === currentQuestion.id);
      if (!localQuestionStats) {
        localQuestionStats = { questionId: currentQuestion.id, cardStats: {}, totalResponses: 0 };
        deck.questionStats.push(localQuestionStats);
      }
      localQuestionStats.totalResponses++;
      if (typeof answerRecord.answer === 'string') {
        localQuestionStats.cardStats[answerRecord.answer] = (localQuestionStats.cardStats[answerRecord.answer] || 0) + 1;
      } else {
        // For sequence questions, update cardStats
        answerRecord.answer.forEach((cardId) => {
          localQuestionStats.cardStats[cardId] = (localQuestionStats.cardStats[cardId] || 0) + 1;
        });
      }

      // Calculate score using the shared function with updated stats
      const questionScore = calculateScore({
        scoringMode: playerSession.scoringMode,
        question: currentQuestion,
        answer: answerRecord.answer,
        questionStats: localQuestionStats,
        timeRemaining: answerRecord.timeRemaining,
      });

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
        // Game complete - send all data to server asynchronously
        // Don't await to prevent UI blocking
        submitFinalResults(newLocalAnswers, newLocalScore).then(response => {
          setFinalScore(response.finalScore);
        }).catch(err => {
          console.error('Failed to submit final results:', err);
          // Still show results with local score as fallback
          setFinalScore(newLocalScore);
        });

        // Wait for answer display time before transitioning to results
        setTimeout(() => {
          setGamePhase('results');
        }, 4000); // ANSWER_DISPLAY_MS (3500ms) + buffer (500ms)
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


  const submitFinalResults = useCallback(async (myAnswers: PlayerAnswer[], myTotalScore: number): Promise<CompleteGameResponse> => {
    if (!playerSession) throw new Error('No player session');

    try {
      const response = await api.completeGame({
        answers: myAnswers,
        totalScore: myTotalScore,
        sessionData: playerSession
      });

      setLeaderboardUpdated(response.leaderboardUpdated);
      setSavedData({ isSaved: true });
      clearTimerStorage();
      localStorage.removeItem(LOCAL_STORAGE_KEY);

      // Update session to finished state with server's calculated score
      setPlayerSession(prev => prev ? {
        ...prev,
        answers: myAnswers,
        totalScore: response.finalScore,
        gameState: 'finished' as const,
        finishedAt: Date.now(),
      } : null);

      return response;
    } catch (err) {
      console.error('Failed to submit final results:', err);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      clearTimerStorage();
      throw err;
    }
  }, [playerSession]);

  const restartGame = useCallback(async () => {
    try {
      const response = await api.getPostData();
      setPlayerDataListener(response);
      clearTimerStorage();
      localStorage.removeItem(LOCAL_STORAGE_KEY);

      // Reset local state
      setPlayerSession(null);
      setLocalAnswers([]);
      setLocalScore(0);
      setGamePhase('welcome');
      setError(null);

      setDeck(response.deck);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError('Failed to refresh game data');
    }
  }, []);

  // Function to navigate to admin screen
  const goToAdminScreen = useCallback(() => {
    setGamePhase('admin');
  }, []);

  // Function to go back to results from admin screen
  const backToResults = useCallback(async () => {
    try {
      const response = await api.getPostData();
      setPlayerDataListener(response);
      setGamePhase('results');
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError('Failed to refresh game data');
    }
  }, []);

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <LiveBackground isActive={true} />
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Debate Dueler ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
        <LiveBackground isActive={true} />
        <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center max-w-md">
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
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <LiveBackground isActive={true} />
        <div className="relative z-10">
          <p className="text-white text-lg">No game data available.</p>
        </div>
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
          leaderboardUpdated={leaderboardUpdated}
          finalScore={finalScore}
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
