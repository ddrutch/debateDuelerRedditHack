import React, { useState } from 'react';
import { THEME_FLAIRS } from './constants';
import { Deck, GameCard, Question } from '../../../shared/types/redditTypes';

interface DeckData {
  title: string;
  description: string;
  theme: string;
  customTheme: string;
  flairCSS: string;
  questions: Question[];
  questionStats: [], 
}

interface CreateDeckWizardProps {
  onClose: () => void;
  onSubmit: (deck: Deck) => void;
  username: string;
  userID : string ;
}

export const CreateDeckWizard: React.FC<CreateDeckWizardProps> = ({ onClose, onSubmit, username, userID }) => {
  const [step, setStep] = useState(1);
  const [questionCount] = useState(5);
  const [errors, setErrors] = useState({
    title: '',
    description: '',
    questions: [] as string[],
  });

  const [deck, setDeck] = useState<DeckData>({
    title: '',
    description: '',
    theme: 'battles',
    flairCSS: 'battles-flair',
    customTheme: '',
    questions: [],
    questionStats: [],
  });


  const createGameCard = (text: string, isCorrect: boolean, sequenceOrder: number): GameCard => ({
    id: `card_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    text,
    isCorrect,
    sequenceOrder
  });


  // Initialize a question with proper GameCard objects
  const initializeQuestion = (): Question => ({
    id: `temp_${Date.now()}`,
    prompt: '',
    cards: [
      createGameCard('', true, 1),
      createGameCard('', false, 2),
      createGameCard('', false, 3),
      createGameCard('', false, 4),
    ],
    timeLimit: 20,
    questionType: 'multiple-choice',
  });


  const [currentQuestion, setCurrentQuestion] = useState<Question>(initializeQuestion());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const isLastStep = () => step === 1 + questionCount + 1;

  const validateStep1 = () => {
    const newErrors = { title: '', description: '' };
    let isValid = true;
    
    if (!deck.title.trim()) {
      newErrors.title = 'Title is required';
      isValid = false;
    }
    
    if (!deck.description.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    }
    
    setErrors({ ...errors, ...newErrors });
    return isValid;
  };

  const validateQuestion = () => {
    const questionErrors = [...errors.questions];
    let isValid = true;
    
    if (!currentQuestion.prompt.trim()) {
      questionErrors[step - 2] = 'Question prompt is required';
      isValid = false;
    }
    
    // Check at least 2 non-empty options
    const validOptions = currentQuestion.cards.filter(card => card.text.trim()).length;
    if (validOptions < 2) {
      questionErrors[step - 2] = 'At least 2 options are required';
      isValid = false;
    }
    
    // For multiple-choice, validate correct card exists
    if (currentQuestion.questionType === 'multiple-choice') {
      const hasCorrect = currentQuestion.cards.some(card => card.isCorrect);
      if (!hasCorrect) {
        questionErrors[step - 2] = 'Please select a correct answer';
        isValid = false;
      }
    }
    
    setErrors({ ...errors, questions: questionErrors });
    return isValid;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step > 1 && step <= 1 + questionCount && !validateQuestion()) return;

    if (step > 1 && step <= 1 + questionCount) {
      setDeck(d => ({
        ...d,
        questions: [...d.questions, currentQuestion],
      }));
      setCurrentQuestion(initializeQuestion());
    }

    if (isLastStep()) {
      const flair = THEME_FLAIRS.find(f => f.id === deck.theme);
      const safeFlair = flair ?? THEME_FLAIRS[0];
      if (!safeFlair) {
        console.error('No flair found. Please check THEME_FLAIRS list.');
        return;
      }
      
      const finalDeck: Deck = {
        title: deck.title,
        description: deck.description,
        theme: deck.theme,
        flairCSS: safeFlair.cssClass,
        questions: deck.questions,
        flairText: safeFlair.label,
        creatorID : userID,
        createdBy: username ,
        createdAt: Date.now(),
        id: `deck_${Date.now()}`,
      };
      
      onSubmit(finalDeck);
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) return onClose();
    setStep(step - 1);
  };

  const updateCard = (index: number, value: string) => {
    const newCards = currentQuestion.cards.map((card, i) => 
      i === index ? {...card, text: value} : card
    );
    
    setCurrentQuestion({
      ...currentQuestion,
      cards: newCards,
    });
  };

  const setCorrectCard = (index: number) => {
    const newCards = currentQuestion.cards.map((card, i) => ({
      ...card,
      isCorrect: i === index
    }));
    
    setCurrentQuestion({
      ...currentQuestion,
      cards: newCards,
    });
  };

  const addCardOption = () => {
    if (currentQuestion.cards.length < 6) {
      setCurrentQuestion({
        ...currentQuestion,
        cards: [
          ...currentQuestion.cards,
          createGameCard(
            '', 
            false, 
            currentQuestion.cards.length + 1
          )
        ],
      });
    }
  };

  const removeCardOption = (index: number) => {
    if (currentQuestion.cards.length > 2) {
      const newCards = [...currentQuestion.cards];
      newCards.splice(index, 1);
      
      // Adjust correct card if needed
      let shouldUpdateCorrect = false;
      if (currentQuestion.questionType === 'multiple-choice') {
        shouldUpdateCorrect = currentQuestion.cards[index]?.isCorrect ?? false;
      }
      
      setCurrentQuestion({
        ...currentQuestion,
        cards: shouldUpdateCorrect
          ? newCards.map((card, i) => ({ ...card, isCorrect: i === 0 }))
          : newCards,
      });
    }
  };

  // Drag and drop functions for sequence questions
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (currentQuestion.questionType === 'sequence') {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex || currentQuestion.questionType !== 'sequence') {
      return;
    }

    const newCards = [...currentQuestion.cards];
    const draggedCard = newCards[draggedIndex];
    
    if (!draggedCard) return;
    
    // Remove dragged card
    newCards.splice(draggedIndex, 1);
    
    // Insert at new position
    newCards.splice(dropIndex, 0, draggedCard);
    
    // Update sequenceOrder for all cards
    const updatedCards = newCards.map((card, index) => ({
      ...card,
      sequenceOrder: index + 1
    }));
    
    setCurrentQuestion({
      ...currentQuestion,
      cards: updatedCards,
    });
    
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/80">
      <div className="bg-gradient-to-br from-purple-800 to-blue-900 rounded-xl p-3 sm:p-6 w-full max-w-2xl md:max-w-3xl lg:max-w-4xl h-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-white text-2xl font-bold">Create New Deck</h4>
              
              <div>
                <label className="block text-blue-200">Title *</label>
                <input
                  className={`w-full p-2 rounded ${errors.title ? 'bg-red-500/30' : 'bg-white/20'} text-white`}
                  value={deck.title}
                  onChange={e => setDeck({ ...deck, title: e.target.value })}
                  placeholder="Enter deck title"
                  maxLength={120}
                />
                {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
              </div>
              
              <div>
                <label className="block text-blue-200">Description *</label>
                <textarea
                  className={`w-full p-2 rounded ${errors.description ? 'bg-red-500/30' : 'bg-white/20'} text-white`}
                  value={deck.description}
                  onChange={e => setDeck({ ...deck, description: e.target.value })}
                  placeholder="Describe your deck"
                  rows={3}
                  maxLength={400}
                />
                {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
              </div>
              
              <div>
                <label className="block text-blue-200 mb-2">Theme</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {THEME_FLAIRS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setDeck(d => ({ ...d, theme: f.id, flairCSS: f.cssClass }))}
                      className={`p-2 sm:p-3 rounded-lg transition-all ${deck.theme === f.id ? 'bg-white/30 ring-2 ring-blue-400' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                      <div className="text-center">
                        <div className="text-lg sm:text-xl">{f.icon}</div>
                        <div className="text-xs sm:text-sm text-white mt-1">{f.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step > 1 && !isLastStep() && (
            <div className="space-y-4">
              <h4 className="text-white text-lg sm:text-xl font-bold">Question {step - 1}</h4>
              
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <button
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                    currentQuestion.questionType === 'multiple-choice' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => setCurrentQuestion({
                    ...currentQuestion,
                    questionType: 'multiple-choice'
                  })}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>🔘</span>
                    <span>Multiple Choice</span>
                  </div>
                </button>
                <button
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                    currentQuestion.questionType === 'sequence' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => setCurrentQuestion({
                    ...currentQuestion,
                    questionType: 'sequence'
                  })}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>🔢</span>
                    <span>Sequence Order</span>
                  </div>
                </button>
              </div>
              
              <div>
                <label className="block text-blue-200">Prompt *</label>
                <input
                  className={`w-full p-2 rounded ${errors.questions[step-2] ? 'bg-red-500/30' : 'bg-white/20'} text-white`}
                  value={currentQuestion.prompt}
                  onChange={e => setCurrentQuestion({ 
                    ...currentQuestion, 
                    prompt: e.target.value 
                  })}
                  placeholder="Enter your question"
                  maxLength={450}
                />
              </div>
              
              <div>
                <label className="block text-blue-200 mb-2">
                  Options * {currentQuestion.questionType === 'sequence' && (
                    <span className="text-sm text-gray-300 ml-2">(Drag to reorder)</span>
                  )}
                </label>
                
                {currentQuestion.questionType === 'sequence' && (
                  <div className="mb-3 p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
                    <p className="text-blue-200 text-sm">
                      💡 <strong>Tip:</strong> Drag the cards to set the correct order. The numbers show the sequence.
                    </p>
                  </div>
                )}
                
                <div className="space-y-3">
                  {currentQuestion.cards.map((card, idx) => (
                    <div 
                      key={card.id} 
                      className={`flex items-center space-x-2 p-3 rounded-lg bg-white/10 border-2 transition-all ${
                        currentQuestion.questionType === 'sequence' 
                          ? 'border-blue-400/50 hover:border-blue-400 cursor-move' 
                          : 'border-transparent'
                      } ${
                        draggedIndex === idx ? 'opacity-50 scale-95' : ''
                      }`}
                      draggable={currentQuestion.questionType === 'sequence'}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                    >
                      {currentQuestion.questionType === 'sequence' && (
                        <div className="flex flex-col items-center space-y-1">
                          <span className="text-white w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 font-bold text-sm">
                            {idx + 1}
                          </span>
                          <div className="text-xs text-gray-300">Drag</div>
                        </div>
                      )}
                      
                      <input
                        className="flex-1 p-3 rounded-lg bg-white/20 text-white placeholder-gray-400 focus:bg-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={card.text}
                        onChange={e => updateCard(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        maxLength={120}
                      />
                      
                      {currentQuestion.questionType === 'multiple-choice' && (
                        <button
                          onClick={() => setCorrectCard(idx)}
                          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                            card.isCorrect 
                              ? 'bg-green-500 hover:bg-green-600' 
                              : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                          title={card.isCorrect ? 'Correct answer' : 'Mark as correct'}
                        >
                          {card.isCorrect ? '✓' : ''}
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
                  
                  {currentQuestion.cards.length < 6 && (
                    <button
                      onClick={addCardOption}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-all flex items-center justify-center space-x-2"
                    >
                      <span>+</span>
                      <span>Add Option</span>
                    </button>
                  )}
                </div>
                
                {errors.questions[step-2] && (
                  <p className="text-red-400 text-sm mt-2 p-2 bg-red-500/20 rounded-lg">{errors.questions[step-2]}</p>
                )}
              </div>
            </div>
          )}

          {isLastStep() && (
            <div className="text-white">
              <h4 className="text-xl sm:text-2xl font-bold mb-4">Review Deck</h4>
              
              <div className="mb-6 p-4 bg-white/10 rounded-lg">
                <p className="mb-2"><strong>Title:</strong> {deck.title}</p>
                <p className="mb-2"><strong>Description:</strong> {deck.description}</p>
                <p><strong>Theme:</strong> {THEME_FLAIRS.find(t => t.id === deck.theme)?.label}</p>
              </div>
              
              <div>
                <h5 className="text-lg sm:text-xl font-bold mb-4">Questions ({deck.questions.length}):</h5>
                <div className="space-y-4">
                  {deck.questions.map((q, idx) => (
                    <div key={idx} className="p-4 bg-white/10 rounded-lg border border-white/20">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-lg font-bold">Q{idx + 1}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          q.questionType === 'sequence' 
                            ? 'bg-blue-500/30 text-blue-300' 
                            : 'bg-green-500/30 text-green-300'
                        }`}>
                          {q.questionType === 'sequence' ? '🔢 Sequence' : '🔘 Multiple Choice'}
                        </span>
                      </div>
                      
                      <p className="mb-3 text-gray-200">{q.prompt}</p>
                      
                      <div className="space-y-2">
                        {q.questionType === 'sequence' ? (
                          <div>
                            <p className="text-sm text-blue-200 mb-2">Correct Order:</p>
                            <div className="space-y-1">
                              {q.cards
                                .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
                                .map((card) => (
                                <div key={card.id} className="flex items-center space-x-3 p-2 bg-blue-500/20 rounded">
                                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-500 text-white text-sm font-bold">
                                    {card.sequenceOrder}
                                  </span>
                                  <span className="text-white">{card.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-green-200 mb-2">Options:</p>
                            <ul className="space-y-1">
                              {q.cards.map((card, cardIdx) => (
                                <li 
                                  key={card.id} 
                                  className={`flex items-center space-x-2 p-2 rounded ${
                                    card.isCorrect 
                                      ? 'bg-green-500/20 text-green-300' 
                                      : 'bg-gray-500/20 text-gray-300'
                                  }`}
                                >
                                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-600 text-white text-xs">
                                    {String.fromCharCode(65 + cardIdx)}
                                  </span>
                                  <span>{card.text}</span>
                                  {card.isCorrect && <span className="text-green-400">✓</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 pt-4 border-t border-white/20">
          <button 
            onClick={handleBack} 
            className="w-full sm:w-auto px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          
          <button
            onClick={handleNext}
            className={`w-full sm:w-auto px-6 py-3 text-white rounded-lg font-medium transition-all ${
              isLastStep() 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLastStep() ? '✨ Create Deck' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};