import React, { useState } from 'react';
import { ScoringMode, Deck, PlayerSession } from '../../shared/types/redditTypes';
import { LiveBackground } from './LiveBackground';

interface WelcomeScreenProps {
  deck: Deck;
  onStartGame: (scoringMode: ScoringMode) => void;
  existingSession: PlayerSession | null;
}

const scoringModes: { mode: ScoringMode; title: string; description: string; icon: string }[] = [
  {
    mode: 'contrarian',
    title: 'Contrarian',
    description: 'Score higher for picking the least popular choice',
    icon: '🎭',
  },
  {
    mode: 'conformist',
    title: 'Conformist',
    description: 'Score higher for picking the most popular choice',
    icon: '👥',
  },
  {
    mode: 'trivia',
    title: 'Trivia',
    description: 'Score based on correct answers',
    icon: '🧠',
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  deck,
  onStartGame,
  existingSession,
}) => {
  const [selectedMode, setSelectedMode] = useState<ScoringMode | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleStartGame = () => {
    if (selectedMode) {
      onStartGame(selectedMode);
    }
  };

  return (
    <div className="relative h-screen flex flex-col items-center justify-center p-4">
      <LiveBackground isActive={true} />
      
      <div className="relative z-10 w-full max-w-lg mx-auto">
        <h1 className="text-white text-4xl font-extrabold text-center mb-6">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">
            {deck.title}
          </span>
        </h1>

        <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20">
          <h2 className="text-white text-2xl font-semibold mb-4 text-center">Choose your mode</h2>
          <div className="space-y-4 mb-4">
            {scoringModes.map((mode) => (
              <div
                key={mode.mode}
                className={`
                  p-4 rounded-lg cursor-pointer transition-all duration-200
                  ${selectedMode === mode.mode ? 'bg-purple-600/50 scale-105' : 'bg-white/10 hover:bg-white/20'}
                  relative
                `}
                onClick={() => setSelectedMode(mode.mode)}
              >
                <div className="flex items-center">
                  <span className="text-3xl mr-3">{mode.icon}</span>
                  <div>
                    <h3 className="text-white font-bold">{mode.title}</h3>
                    <p className="text-sm text-blue-200">{mode.description}</p>
                  </div>
                </div>
                {selectedMode === mode.mode && (
                  <svg
                    className="absolute top-2 right-2 text-white h-6 w-6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>
            ))}
          </div>
          
          <button
            onClick={handleStartGame}
            disabled={!selectedMode}
            className={`
              w-full font-bold py-3 rounded-xl transition-all duration-200
              ${selectedMode ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}
            `}
          >
            Start Game
          </button>
          
          <div className="text-center mt-4">
            <button
              onClick={() => setShowHowToPlay(true)}
              className="text-blue-200 text-sm hover:underline"
            >
              How to Play
            </button>
          </div>
        </div>
      </div>
      
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl shadow-xl w-full max-w-sm border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-xl">How to Play</h3>
            </div>
            
            <div className="space-y-4">
              <ul className="text-blue-200 space-y-3">
                <li className="flex items-start">
                  <span className="mr-2 text-xl">•</span>
                  <span>Choose your scoring strategy</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-xl">•</span>
                  <span>Answer {deck.questions.length} timed questions</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-xl">•</span>
                  <span>Compete on the leaderboard</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-xl">•</span>
                  <span>Add your own questions after playing!</span>
                </li>
              </ul>
              
              <div className="pt-4">
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 rounded-xl"
                >
                  Got It!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};