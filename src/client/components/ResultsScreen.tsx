import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Deck, PlayerSession, LeaderboardEntry } from '../../shared/types/game';
import { api } from '../api';
import { THEME_FLAIRS } from './comComponents/constants';
import { CreateDeckWizard } from './comComponents/deckWizard';
import { LiveBackground } from './LiveBackground';
import { showToast, navigateTo } from '@devvit/web/client';

interface ResultsScreenProps {
  deck: Deck;
  playerSession: PlayerSession;
  onRestartGame: () => void;
  onGoToAdminScreen: () => void;
  isAdmin: boolean;
  leaderboardUpdated?: boolean;
  finalScore: number;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  deck,
  playerSession,
  onRestartGame,
  onGoToAdminScreen,
  isAdmin,
  leaderboardUpdated = true,
  finalScore,
}) => {
    const [showQuestionAddedFeedback, setShowQuestionAddedFeedback] = useState(false);
    
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [playerRank, setPlayerRank] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [leaderboardTab, setLeaderboardTab] = useState<'top' | 'near'>('top');
    const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
    const [isCreateDeckModalOpen, setIsCreateDeckModalOpen] = useState(false);
    const [questionType, setQuestionType] = useState<'multiple-choice' | 'sequence'>('multiple-choice');
    const [isRestartingGame, setIsRestartingGame] = useState(false);
    const leaderboardRef = useRef<HTMLDivElement>(null);
    const [newQuestion, setNewQuestion] = useState({
      prompt: '',
      cards: ['', '', '', ''],
      correctIndex: 0,
    });
  
    const updateCard = (index: number, value: string) => {
      const cards = [...newQuestion.cards];
      cards[index] = value;
      setNewQuestion({ ...newQuestion, cards });
    };
  
    const setCorrectCard = (index: number) => {
      setNewQuestion({ ...newQuestion, correctIndex: index });
    };
  
    const addCardOption = () => {
      if (newQuestion.cards.length < 6) {
        setNewQuestion({
          ...newQuestion,
          cards: [...newQuestion.cards, ''],
        });
      }
    };
  
    const removeCardOption = (index: number) => {
      if (newQuestion.cards.length > 2) {
        const cards = [...newQuestion.cards];
        cards.splice(index, 1);
  
        // Adjust correct index if needed
        let correctIndex = newQuestion.correctIndex;
        if (correctIndex >= index && correctIndex > 0) {
          correctIndex--;
        } else if (correctIndex === index) {
          correctIndex = 0;
        }
  
        setNewQuestion({
          ...newQuestion,
          cards,
          correctIndex,
        });
      }
    };

  // New deck creation state
  const [newDeck, setNewDeck] = useState({
    title: '',
    description: '',
    theme: 'battles',
    customTheme: '',
    flairCSS: 'battles-flair', // Default flair CSS
    questions: [] as Array<{
      prompt: string;
      cards: string[];
      correctIndex: number;
      questionType: 'multiple-choice' | 'sequence';
    }>,
  });
  const [currentDeckQuestion, setCurrentDeckQuestion] = useState({
    prompt: '',
    cards: ['', '', '', ''],
    correctIndex: 0,
    questionType: 'multiple-choice' as 'multiple-choice' | 'sequence',
  });
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  // Determine if the current user is the creator of the deck
  const isDeckCreator = playerSession.userId === deck.createdBy;
  const canAccessAdmin = isAdmin || isDeckCreator; // User is admin if either isAdmin is true or they created the deck

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await api.getLeaderboard(leaderboardTab);
        setLeaderboard(response.leaderboard);
        setPlayerRank(response.playerRank ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [leaderboardTab]);

  // Scroll to top when leaderboard changes
  useLayoutEffect(() => {
    if (leaderboardRef.current) {
      leaderboardRef.current.scrollTop = 0;
    }
  }, [leaderboard]);

  const handleAddQuestion = async () => {
    setIsAddingQuestion(true); // Start loading

    // Filter out empty cards and validate
    const validCards = newQuestion.cards.filter(text => text.trim());
    if (validCards.length < 2 || !newQuestion.prompt.trim()) {
      setIsAddingQuestion(false);
      return;
    }

    let cards;
    if (questionType === 'multiple-choice') {
      cards = validCards.map((text, index) => ({
        id: `card_${index}`,
        text: text.trim(),
        isCorrect: index === newQuestion.correctIndex,
      }));
    } else {
      cards = validCards.map((text, index) => ({
        id: `step_${index}`,
        text: text.trim(),
        sequenceOrder: index + 1,
      }));
    }

    try {
      await api.addQuestion({
        question: {
          id : `user_${Date.now()}`,
          prompt: newQuestion.prompt.trim(),
          cards,
          timeLimit: 20,
          questionType,
        },
      });
      // Show feedback and close modal
      setShowQuestionAddedFeedback(true);
      setIsAddQuestionModalOpen(false);

      // Reset form for next use
      resetForm();

      setTimeout(() => setShowQuestionAddedFeedback(false), 3000);
    } catch (error) {
      console.error('Failed to add question:', error);
    } finally {
      setIsAddingQuestion(false); // End loading
    }
  };

  // Reset form after successful submission
  const resetForm = () => {
    setNewQuestion({
      prompt: '',
      cards: ['', '', '', ''],
      correctIndex: 0,
    });
    setQuestionType('multiple-choice');
  };

  const handleCreateDeck = async (createdDeck: Deck) => {
    if (!createdDeck.title.trim() || !createdDeck.description.trim()) {
      return;
    }

    if (createdDeck.questions.length < 5) {
      return;
    }
    
    const selectedFlair = THEME_FLAIRS.find(f => f.id === createdDeck.theme) ?? THEME_FLAIRS[0];
    


    setIsCreatingPost(true);

    try {
      // Prepare deck data - no need to convert questions
      const deckData: Deck = {
        ...createdDeck,
        theme: createdDeck.theme,
        flairCSS: selectedFlair?.cssClass ?? 'battles-flair',
      };

      // Send to backend
      const response = await api.createNewPost({
        postData: deckData,
      });

      // Handle UI effects from server response
      if (response.showToast) {
        showToast(response.showToast.text);
      }

      if (response.navigateTo) {
        navigateTo(response.navigateTo);
      }

      // Close modal
      setIsAddQuestionModalOpen(false);
      setIsCreateDeckModalOpen(false);
    } catch (error) {
      console.error('Failed to create deck:', error);
      alert('Failed to create deck. Please try again.');
    } finally {
      setIsCreatingPost(false);
    }
  };
  
  const getScoringModeIcon = () => {
    switch (playerSession.scoringMode) {
      case 'contrarian':
        return '🎭';
      case 'conformist':
        return '👥';
      case 'trivia':
        return '🧠';
      default:
        return '🧠';
    }
  };


  const getSelectedTheme = () => {
    return THEME_FLAIRS.find(theme => theme.id === newDeck.theme) || THEME_FLAIRS[0];
  };

  const handleRestartGame = async () => {
    setIsRestartingGame(true);
    try {
      await onRestartGame();
    } finally {
      setIsRestartingGame(false);
    }
  };


  return (
  <div className="h-screen p-3 flex flex-col relative bg-transparent">
    <LiveBackground isActive={true} />
    {/* Main content area with reduced gap */}
    <div className="flex-grow flex flex-col md:flex-row gap-4 mb-2 relative z-10">
      {/* Player Score - Reduced size */}
      <div className="md:w-1/4 flex flex-col">
        <div className="text-center mb-2">
          <h1 className="text-xl md:text-2xl font-bold text-white">
                Game Complete!
          </h1>
        </div>
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-2 flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <span className="text-2xl md:text-3xl">{getScoringModeIcon()}</span>
              <span className="text-white font-semibold capitalize text-sm md:text-base">
                {playerSession.scoringMode}
              </span>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-white mb-1">
              {finalScore}
            </div>
            <div className="text-yellow-200 text-sm md:text-base font-medium">
              {playerRank ? `Rank #${playerRank}` : 'Your Score'}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard - Takes more space */}
      <div className="md:flex-1 flex flex-col">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 flex-1 flex flex-col max-h-70">
          <h3 className="text-white font-bold text-center mb-2 text-base md:text-lg">
            🏆 Leaderboard
          </h3>
          {/* Tab buttons */}
          <div className="flex justify-center mb-2">
            <button
              onClick={() => setLeaderboardTab('top')}
              className={`px-3 py-1 mx-1 rounded-lg text-sm font-medium transition-all ${
                leaderboardTab === 'top'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Top 15
            </button>
            <button
              onClick={() => setLeaderboardTab('near')}
              className={`px-3 py-1 mx-1 rounded-lg text-sm font-medium transition-all ${
                leaderboardTab === 'near'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Near You
            </button>
          </div>
          {!leaderboardUpdated && (
            <div className="text-yellow-200 text-center text-sm mb-2 px-2">
              <span className="text-yellow-300">⚠️</span> Only your first try counts toward the leaderboard
            </div>
          )}
          {loading ? (
            <div className="text-center text-blue-200 text-sm">Loading...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center text-blue-200 text-sm">Be the first to play!</div>
          ) : (
            <div ref={leaderboardRef} className="flex-1 flex flex-col space-y-2 md:space-y-1 lg:space-y-0.5 overflow-y-auto custom-scrollbar">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`
                    transform
                    -   lg:scale-95
                    +   lg:scale-y-92
                    flex items-center justify-between
                    p-3 md:p-2 lg:py-1 lg:px-2
                    rounded-lg
                    text-base md:text-sm
                    ${entry.userId === playerSession.userId
                      ? 'bg-yellow-500/20 border border-yellow-500/50'
                      : 'bg-white/5'}
                  `}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-bold text-lg md:text-base">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="text-white truncate max-w-[120px]">
                      {entry.username}
                    </span>
                    <span className="text-lg md:text-xl">
                      {entry.scoringMode === 'contrarian' ? '🎭' :
                       entry.scoringMode === 'conformist' ? '👥' : '🧠'}
                    </span>
                  </div>
                  <span className="text-white font-bold text-lg md:text-base">
                    {entry.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
      
      {/* Action Buttons - Smaller and more compact */}
      <div className="flex justify-center gap-3 pb-2 relative z-10">
        <button
          onClick={handleRestartGame}
          disabled={isRestartingGame}
          className="relative w-20 h-20 flex flex-col items-center justify-center bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-lg transition-all overflow-hidden"
        >
          {isRestartingGame && (
            <div className="absolute top-0 left-0 right-0 bg-black/30 backdrop-blur-sm rounded-t-lg px-2 py-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            </div>
          )}
          <span className="text-xl">
              <img
                src="/ui/icons/arrow-rotate-right.svg"
                alt="Play Again"
                className="w-9 h-9 inline-block"
              />
            </span>
          <span className="text-xs mt-1">{isRestartingGame ? 'Loading...' : 'Play Again'}</span>
        </button>
        
        <button
          onClick={() => setIsAddQuestionModalOpen(true)}
          disabled={isAddingQuestion}
          className="w-20 h-20 flex flex-col items-center justify-center bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
        >
          {/* <span className="text-xl">➕</span> */}
          <span className="text-xl">
              <img 
                src="/ui/icons/square-plus.svg" 
                alt="Add Question" 
                className="w-9 h-9 inline-block" 
              />
            </span>
          <span className="text-xs mt-1">Add Question</span>
        </button>
        
        <button
          onClick={() => setIsCreateDeckModalOpen(true)}
          className="w-20 h-20 flex flex-col items-center justify-center bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold rounded-lg transition-all"
        >
          <span className="text-xl">
            <img
              src="/ui/icons/address-card.svg"
              alt="Create Deck"
              className="w-9 h-9 inline-block"
            />
          </span>
          <span className="text-xs mt-1">Create Deck</span>
        </button>


        {/* Admin Button - Only visible if canAccessAdmin is true */}
        {canAccessAdmin && (
          <button
            onClick={onGoToAdminScreen}
            className="w-20 h-20 flex flex-col items-center justify-center bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-lg transition-all"
          >
            {/* <span className="text-xl">⚙️</span> */}
            <span className="text-xl">
              <img 
                src="/ui/icons/toolbox.svg" 
                alt="Admin" 
                className="w-9 h-9 inline-block" 
              />
            </span>
            <span className="text-xs mt-1">Admin</span>
          </button>
        )}
      </div>


      {/* Add Question Modal */}
      {isAddQuestionModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/80">
          <div className="bg-gradient-to-br from-purple-800 to-blue-900 rounded-xl p-3 sm:p-6 w-full max-w-2xl md:max-w-3xl lg:max-w-4xl h-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-white font-bold text-xl">Add Your Question</h4>
              <button onClick={() => setIsAddQuestionModalOpen(false)} className="text-white text-3xl hover:text-gray-300">×</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto pb-40 sm:pb-0 pr-2 custom-scrollbar">
              <div className="space-y-4">
                {/* Question Type Selection */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setQuestionType('multiple-choice')}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      questionType === 'multiple-choice'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>🔘</span>
                      <span>Multiple Choice</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setQuestionType('sequence')}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      questionType === 'sequence'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>🔢</span>
                      <span>Sequence Order</span>
                    </div>
                  </button>
                </div>

                {/* Prompt */}
                <div>
                  <label className="block text-blue-200 mb-2">Question Prompt *</label>
                  <input
                    type="text"
                    value={newQuestion.prompt}
                    onChange={(e) => setNewQuestion({ ...newQuestion, prompt: e.target.value })}
                    placeholder="Enter your question..."
                    className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    maxLength={450}
                  />
                </div>

                {/* Options */}
                <div>
                  <label className="block text-blue-200 mb-2">
                    Options * {questionType === 'sequence' && (
                      <span className="text-sm text-gray-300 ml-2">(Drag to reorder)</span>
                    )}
                  </label>

                  {questionType === 'sequence' && (
                    <div className="mb-3 p-3 bg-indigo-900/50 rounded-lg border border-indigo-500/30">
                      <p className="text-blue-200 text-sm mb-2">
                        <span className="text-yellow-300">ℹ️</span> For sequence questions, the order shown above (1-4) will be the correct order. Players will need to arrange the items in this sequence.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {newQuestion.cards.map((card, idx) => (
                      <div key={idx} className="flex items-center space-x-2 p-3 rounded-lg bg-white/10 border-2 border-transparent">
                        {questionType === 'sequence' && (
                          <div className="flex flex-col items-center space-y-1 mr-2">
                            <span className="text-white w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 font-bold text-sm">
                              {idx + 1}
                            </span>
                          </div>
                        )}

                        <input
                          type="text"
                          value={card}
                          onChange={(e) => updateCard(idx, e.target.value)}
                          placeholder={questionType === 'sequence' ? `Step ${idx + 1}` : `Option ${idx + 1}`}
                          className="flex-1 p-3 rounded-lg bg-white/20 text-white placeholder-gray-400 focus:bg-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          maxLength={120}
                        />

                        {questionType === 'multiple-choice' && (
                          <button
                            onClick={() => setCorrectCard(idx)}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                              newQuestion.correctIndex === idx
                                ? 'bg-green-500 hover:bg-green-600'
                                : 'bg-gray-600 hover:bg-gray-500'
                            }`}
                            title={newQuestion.correctIndex === idx ? 'Correct answer' : 'Mark as correct'}
                          >
                            {newQuestion.correctIndex === idx ? '✓' : ''}
                          </button>
                        )}

                        <button
                          onClick={() => removeCardOption(idx)}
                          className="w-10 h-10 flex items-center justify-center bg-red-500/80 hover:bg-red-500 rounded-lg transition-all"
                          title="Remove option"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    {newQuestion.cards.length < 6 && (
                      <button
                        onClick={addCardOption}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-all flex items-center justify-center space-x-2"
                      >
                        <span>+</span>
                        <span>Add Option</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions - Fixed at bottom on mobile */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 pt-4 border-t border-white/20 sm:relative fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-br from-purple-800 to-blue-900 sm:bg-transparent sm:p-0 sm:border-t">
              <button
                onClick={() => setIsAddQuestionModalOpen(false)}
                className="w-full sm:w-auto px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestion}
                disabled={isAddingQuestion}
                className={`w-full sm:w-auto px-6 py-3 text-white rounded-lg font-medium transition-all ${
                  isAddingQuestion ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isAddingQuestion ? 'Adding...' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional feedback toast */}
      {showQuestionAddedFeedback && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg">
          Question added!
        </div>
      )}
      
      {/* Create Deck Wizard Modal */}
      {isCreateDeckModalOpen && (
        <CreateDeckWizard
          onClose={() => setIsCreateDeckModalOpen(false)}
          onSubmit={handleCreateDeck}
          username={playerSession.username}
          userID={playerSession.userId}
          isCreatingPost={isCreatingPost}
        />
      )}
    </div>
  );
};