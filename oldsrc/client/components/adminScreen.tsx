import React, { useState } from 'react';
import { Deck, Question, PlayerSession, GameCard } from '../../shared/types/redditTypes'; // Import GameCard
import { sendToDevvit } from '../utils.js';

interface AdminScreenProps {
  deck: Deck;
  playerSession: PlayerSession; 
  onBackToResults: () => void;
  isAdmin : boolean
}

export const AdminScreen: React.FC<AdminScreenProps> = ({
  deck,
  playerSession,
  onBackToResults,
  isAdmin,
}) => {
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);

  // Check if the current user is the deck creator or an admin
  const isCreatorOrAdmin = playerSession.userId === deck.creatorID || isAdmin;

  if (!isCreatorOrAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center max-w-md">
          <h2 className="text-white text-xl font-bold mb-4">Access Denied</h2>
          <p className="text-white/90 mb-4">You do not have permission to access this page.</p>
          <button
            onClick={onBackToResults}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  const handleEditClick = (question: Question) => {
    setEditingQuestion({ ...question }); // Create a copy to edit
  };

  const handleDeleteClick = (questionId: string) => {
    setQuestionToDelete(questionId);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingQuestion) {
      sendToDevvit({
        type: 'EDIT_QUESTION',
        payload: { question: editingQuestion },
      });
      setEditingQuestion(null);
      setShowFeedback('Question updated successfully!');
      setTimeout(() => setShowFeedback(null), 3000);
    }
  };

  const handleConfirmDelete = () => {
    if (questionToDelete) {
      sendToDevvit({
        type: 'DELETE_QUESTION',
        payload: { questionId: questionToDelete },
      });
      setIsDeleteModalOpen(false);
      setQuestionToDelete(null);
      setShowFeedback('Question deleted successfully!');
      setTimeout(() => setShowFeedback(null), 3000);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 flex flex-col">
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 flex-grow flex flex-col overflow-hidden">
        
        {/* Container for the heading and tags */}
        <div className="relative mb-6">
          <h2 className="text-white text-3xl font-bold text-center">Manage Deck Questions</h2>
          <div className="absolute top-0 right-0 flex space-x-2">
            {playerSession.userId === deck.creatorID && (
              <span className="bg-green-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
                Deck Creator
              </span>
            )}
            {isAdmin && (
              <span className="bg-blue-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
                Admin
              </span>
            )}
          </div>
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          {deck.questions.length === 0 ? (
            <p className="text-white/70 text-center text-lg mt-10">No questions in this deck yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deck.questions.map((question) => (
                <div key={question.id} className="bg-white/15 rounded-lg p-4 shadow-lg flex flex-col">
                  <p className="text-white font-semibold text-lg mb-2">{question.prompt}</p>
                  <ul className="list-disc list-inside text-white/80 text-sm mb-4 flex-grow">
                    {question.cards.map((card) => (
                      <li key={card.id} className={card.isCorrect ? 'text-green-300' : ''}>
                        {card.text} {card.isCorrect && '(Correct)'} {card.sequenceOrder && `(Order: ${card.sequenceOrder})`}
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-end space-x-2 mt-auto">
                    <button
                      onClick={() => handleEditClick(question)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(question.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onBackToResults}
            className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-colors"
          >
            Back to Results
          </button>
        </div>
      </div>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-30 px-4">
          <div className="bg-gradient-to-br from-purple-800 to-blue-900 rounded-lg p-6 w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col">
            <h4 className="text-white font-bold text-2xl mb-4">Edit Question</h4>
            <label className="block text-blue-200 text-base mb-2">Prompt</label>
            <input
              type="text"
              value={editingQuestion.prompt}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, prompt: e.target.value })}
              className="w-full p-2 text-base rounded-lg bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:outline-none mb-4"
            />
            {editingQuestion.cards.map((card, idx) => (
              <div key={card.id} className="flex items-center space-x-3 mb-2">
                <input
                  type="text"
                  value={card.text}
                  onChange={(e) => {
                    const updatedCards = [...editingQuestion.cards];
                    // Explicitly define the type for clarity and to satisfy exactOptionalPropertyTypes
                    updatedCards[idx] = { ...card, text: e.target.value } as GameCard;
                    setEditingQuestion({ ...editingQuestion, cards: updatedCards });
                  }}
                  className="flex-1 p-2 text-base rounded-lg bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:outline-none"
                />
                {editingQuestion.questionType === 'multiple-choice' && (
                  <button
                    onClick={() => {
                      const updatedCards = editingQuestion.cards.map((c, i) => ({
                        ...c,
                        isCorrect: i === idx,
                      }));
                      setEditingQuestion({ ...editingQuestion, cards: updatedCards });
                    }}
                    className={`px-3 py-1 text-base rounded-lg ${card.isCorrect ? 'bg-green-500 text-white' : 'bg-white/20 text-blue-200'}`}
                  >
                    ✓
                  </button>
                )}
                {editingQuestion.questionType === 'sequence' && (
                  <input
                    type="number"
                    value={card.sequenceOrder || ''}
                    onChange={(e) => {
                      const updatedCards = [...editingQuestion.cards];
                      // Explicitly define the type for clarity and to satisfy exactOptionalPropertyTypes
                      // Ensure sequenceOrder is a number or undefined
                      const newSequenceOrder = parseInt(e.target.value);
                      updatedCards[idx] = { 
                        ...card, 
                        sequenceOrder: isNaN(newSequenceOrder) ? undefined : newSequenceOrder 
                      } as GameCard;
                      setEditingQuestion({ ...editingQuestion, cards: updatedCards });
                    }}
                    placeholder="Order"
                    className="w-20 p-2 text-base rounded-lg bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:outline-none"
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 text-base rounded-lg bg-gray-600 text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 text-base rounded-lg bg-green-600 text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-30 px-4">
          <div className="bg-gradient-to-br from-red-800 to-orange-900 rounded-lg p-6 w-full max-w-sm text-center">
            <h4 className="text-white font-bold text-xl mb-4">Confirm Deletion</h4>
            <p className="text-white/90 mb-6">Are you sure you want to delete this question? This action cannot be undone.</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-base rounded-lg bg-gray-600 text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-6 py-2 text-base rounded-lg bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {showFeedback && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg">
          {showFeedback}
        </div>
      )}
    </div>
  );
};