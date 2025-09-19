import React, { useState, useEffect } from 'react';
import {
  Question,
  PlayerSession,
} from '../../shared/types/game';

interface AnswerCardsProps {
  displayQuestion: Question;
  playerSession: PlayerSession;
  selectedCardId: string | null;
  showResults: boolean;
  isSubmitting: boolean;
  sequenceOrder: Record<string, number>;
  answeredSequenceOrder: Record<string, number>;
  handleSequenceSelect: (cardId: string) => void;
  submitSequence: () => void;
  handleCardSelect: (cardId: string) => void;
  getCardPercentage: (cardId: string) => number;
  getCardCorrect: (cardId: string) => boolean;
  getTintStyle: (cardId: string) => React.CSSProperties;
  getPositionPercentage: (cardId: string, position: number) => number;
  getPositionTintStyle: (cardId: string, position: number) => React.CSSProperties;
  scoringMode: string;
}

export const AnswerCards: React.FC<AnswerCardsProps> = ({
  displayQuestion,
  playerSession,
  selectedCardId,
  showResults,
  isSubmitting,
  sequenceOrder,
  answeredSequenceOrder,
  handleSequenceSelect,
  submitSequence,
  handleCardSelect,
  getCardPercentage,
  getCardCorrect,
  getTintStyle,
  getPositionPercentage,
  getPositionTintStyle,
  scoringMode,
}) => {

  const [animatedWidths, setAnimatedWidths] = useState<Record<string, number>>({});
  const gridClasses = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2';

  const getGamemodeColor = (mode: string) => {
    switch (mode) {
      case 'conformist': return '#22c55e'; // green-500
      case 'contrarian': return '#ef4444'; // red-500
      case 'trivia': return '#3b82f6'; // blue-500
      default: return '#fbbf24'; // yellow-500
    }
  };

  // Animate bars when showResults becomes true
  useEffect(() => {
    if (showResults && displayQuestion) {
      const newWidths: Record<string, number> = {};

      if (displayQuestion.questionType === 'sequence') {
        // For sequence questions, animate position-based percentages
        Object.entries(answeredSequenceOrder).forEach(([cardId, order]) => {
          const pct = getPositionPercentage(cardId, order);
          newWidths[`${cardId}-${order}`] = pct;
        });
      } else {
        // For regular questions, animate card percentages
        displayQuestion.cards.forEach(card => {
          const pct = getCardPercentage(card.id);
          newWidths[card.id] = pct;
        });
      }

      // Start animation after a brief delay to ensure DOM is ready
      setTimeout(() => {
        setAnimatedWidths(newWidths);
      }, 50);
    } else {
      // Reset widths when not showing results
      setAnimatedWidths({});
    }
  }, [showResults, displayQuestion, getCardPercentage, getPositionPercentage, answeredSequenceOrder]);
  return (
    <div className="flex flex-col h-full w-full">
      {displayQuestion.questionType === 'sequence' ? (
        showResults ? (
          // Sequence results - show cards in grid with position-based stats like multiple choice
          <div className={`${gridClasses} flex-1`}>
            {displayQuestion.cards.map(card => {
              const order = answeredSequenceOrder[card.id];
              const pct = order ? getPositionPercentage(card.id, order) : 0;
              const tintStyle = order ? getPositionTintStyle(card.id, order) : {};

              return (
                <div
                  key={card.id}
                  className={`relative flex flex-col items-center justify-center w-full h-full p-3 rounded-xl border-2 overflow-hidden transition-all ${
                    order
                      ? 'border-yellow-400 bg-yellow-500/20 shadow-[0_0_10px_rgba(250,204,21,0.6)]'
                      : 'border-white/30 bg-white/10'
                  }`}
                  style={tintStyle}
                >
                  {/* Background gradient for selected cards */}
                  {order && (
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 transition-all duration-1000"
                      style={{ width: `${animatedWidths[`${card.id}-${order}`] || 0}%` }}
                    />
                  )}

                  {/* Position number badge */}
                  {order && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full text-white font-bold text-sm shadow-lg border-2 border-white/20 z-10">
                      {order}
                    </div>
                  )}

                  {/* Card text */}
                  <span className={`font-semibold text-center text-sm sm:text-base md:text-xl text-white relative z-10 ${
                    order ? 'mt-2' : ''
                  }`}>
                    {card.text}
                  </span>

                  {/* Percentage display for selected cards - like multiple choice */}
                  {order && pct > 0 && (
                    <div className="relative flex items-center justify-end space-x-2 text-sm sm:text-base mt-auto z-10">
                      <span className="font-bold text-white">{pct}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-1 h-full">
            {/* The grid now grows to fill the remaining space */}
            <div className={`${gridClasses} flex-1`}>
              {displayQuestion.cards.map(card => {
                const order = sequenceOrder[card.id];
                return (
                  <button
                    key={card.id}
                    onClick={() => handleSequenceSelect(card.id)}
                    disabled={showResults || isSubmitting}
                    className={`relative flex flex-col items-center justify-center w-full h-full p-3 rounded-xl border-2 overflow-hidden transition-all ${
                      order
                        ? 'border-purple-400 bg-gradient-to-br from-purple-500/30 to-purple-600/30 shadow-lg'
                        : 'border-white/50 bg-white/10 hover:bg-white/20'
                    } active:scale-[0.98]`}
                  >
                    {order && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 rounded-full text-white font-bold text-sm shadow-lg border-2 border-white/20">
                        {order}
                      </div>
                    )}
                    {/* Responsive text size */}
                    <span className={`font-semibold text-center text-sm sm:text-base md:text-xl text-white ${
                      order ? 'mt-2' : ''
                    }`}>{card.text}</span>
                    {showResults && getCardPercentage(card.id) > 0 && (
                      <div className="absolute bottom-1 left-1 right-1 text-xs text-white/80 text-center">
                        {getCardPercentage(card.id)}%
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {Object.keys(sequenceOrder).length > 0 && !showResults && (
              <div className="mt-2 flex justify-center flex-shrink-0">
                <button onClick={submitSequence} disabled={isSubmitting} className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-2 px-4 rounded transition-all disabled:opacity-50 text-base">Submit</button>
              </div>
            )}
          </div>
        )
      ) : (
        // The grid container will now grow to fill the available vertical space.
        <div className={`${gridClasses} flex-1`}>          
          {displayQuestion.cards.map(card => {
            const isSelected = selectedCardId === card.id;
            const pct = showResults ? getCardPercentage(card.id) : 0;
            const isCorrect = showResults && getCardCorrect(card.id);
            const baseClasses = `relative flex items-center justify-between w-full h-full p-3 rounded-xl border-2 overflow-hidden transition-all`;
            let stateClasses = '';
            let extraStyle: React.CSSProperties = {};
            if (!showResults) {
              stateClasses = isSelected ? 'border-white bg-white/20 hover:bg-white/30' : 'border-white/50 bg-white/10 hover:bg-white/20';
            } else {
              if (isSelected) {
                const gamemodeColor = getGamemodeColor(scoringMode);
                extraStyle = {
                  borderColor: gamemodeColor,
                  backgroundColor: `${gamemodeColor}33`,
                  boxShadow: `0 0 10px ${gamemodeColor}99`,
                };
              } else if (playerSession.scoringMode === 'trivia') {
                stateClasses = isCorrect ? 'border-green-400 bg-green-500/20' : 'border-red-400 bg-red-500/20';
              } else {
                stateClasses = 'border-transparent';
              }
            }
            return (
              <button key={card.id} onClick={() => handleCardSelect(card.id)} disabled={showResults || isSubmitting} className={`${baseClasses} ${stateClasses}`} style={{...getTintStyle(card.id), ...extraStyle}}>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 transition-all duration-1000" style={{ width: `${animatedWidths[card.id] || 0}%` }} />
                {/* Responsive text size */}
                <span className="relative flex-1 font-semibold text-left text-sm sm:text-base md:text-xl text-white">{card.text}</span>
                {showResults && (
                  <div className="relative flex items-center space-x-2 text-sm sm:text-base">
                    <span className="font-bold text-white">{pct}%</span>
                    {isCorrect && <span className="text-xl text-green-400">✓</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
