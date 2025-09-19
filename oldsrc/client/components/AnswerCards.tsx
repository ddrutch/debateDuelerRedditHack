import React from 'react';
import {
  Question,
  PlayerSession,
} from '../../shared/types/redditTypes';

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
}) => {

  const gridClasses = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2';
  return (
    <div className="flex flex-col h-full w-full">
      {displayQuestion.questionType === 'sequence' ? (
        showResults ? (
          // Sequence results - show your sequence with position-based stats
          <div className="flex flex-col gap-2 p-1 overflow-hidden">
            {/* Your Sequence with Position Stats */}
            <div className="bg-yellow-500/10 border border-yellow-400 rounded-lg p-2">
              <h3 className="text-yellow-300 text-center mb-2 text-sm font-semibold">Your Sequence:</h3>
              <div className="flex flex-col gap-2">
                {Object.keys(answeredSequenceOrder).length === 0 ? (
                  <div className="text-yellow-200 text-center text-sm">No sequence data available</div>
                ) : (
                  Object.entries(answeredSequenceOrder)
                    .sort((a, b) => a[1] - b[1])
                    .map(([cardId, order]) => {
                      const card = displayQuestion.cards.find(c => c.id === cardId);
                      const pct = getPositionPercentage(cardId, order);
                      const tintStyle = getPositionTintStyle(cardId, order);
                      
                      return card ? (
                        <div 
                          key={cardId} 
                          className="relative flex items-center justify-between p-3 rounded-lg border-2 border-yellow-400 bg-yellow-500/20 shadow-[0_0_10px_rgba(250,204,21,0.6)]"
                          style={tintStyle}
                        >
                          <div className="flex items-center">
                            <span className="text-white mr-2 font-bold text-sm">{order}.</span>
                            <span className="text-white text-sm font-semibold">{card.text}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-bold text-sm">{pct}%</span>
                            <div className="w-16 h-2 bg-white/20 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })
                )}
              </div>
            </div>
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
                    // REMOVED min-h-[8rem] to allow the card to be flexible. h-full lets it fill the grid cell.
                    className={`relative flex items-center justify-center w-full h-full p-3 rounded-xl border-2 overflow-hidden transition-all border-white/50 bg-white/10 hover:bg-white/20 active:scale-[0.98] ${order ? 'border-purple-400 bg-purple-500/20' : ''}`}
                  >
                    {order && (
                      <div className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-purple-500 rounded-full text-white font-bold text-xs">
                        {order}
                      </div>
                    )}
                    {/* Responsive text size */}
                    <span className="relative flex-1 font-semibold text-center text-sm sm:text-base md:text-xl text-white">{card.text}</span>
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
            if (!showResults) {
              stateClasses = isSelected ? 'border-white bg-white/20 hover:bg-white/30' : 'border-white/50 bg-white/10 hover:bg-white/20';
            } else {
              if (isSelected) {
                stateClasses = 'border-yellow-400 bg-yellow-500/20 shadow-[0_0_10px_rgba(250,204,21,0.6)]';
              } else if (playerSession.scoringMode === 'trivia') {
                stateClasses = isCorrect ? 'border-green-400 bg-green-500/20' : 'border-red-400 bg-red-500/20';
              } else {
                stateClasses = 'border-transparent';
              }
            }
            return (
              <button key={card.id} onClick={() => handleCardSelect(card.id)} disabled={showResults || isSubmitting} className={`${baseClasses} ${stateClasses}`} style={getTintStyle(card.id)}>
                {showResults && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 transition-all duration-500" style={{ width: `${pct}%` }} />
                )}
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
