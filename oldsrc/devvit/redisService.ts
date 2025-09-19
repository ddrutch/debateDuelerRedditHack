// redisService.ts

import { Devvit, TriggerContext } from "@devvit/public-api";
import { LeaderboardEntry } from "../shared/types/redditTypes.js";
import { PlayerSession } from "../shared/types/redditTypes.js";
import { Deck } from "../shared/types/redditTypes.js";
import { Question } from "../shared/types/redditTypes.js";
import { PlayerAnswer } from "../shared/types/redditTypes.js";

import { ScoringMode ,  QuestionStats} from "../shared/types/redditTypes.js";

export const getPlayerSessionKey = (postId: string, userId: string) => `game:${postId}:player:${userId}`;
export const getQuestionStatsKey = (postId: string, questionId: string) => `stats:${postId}:${questionId}`;
export const getLeaderboardKey = (postId: string) => `leaderboard:${postId}`;
export const getDeckKey = (postId: string) => `deck:${postId}`;

Devvit.configure({
    redis: true,
    realtime: true,
    redditAPI: true,

});


export type RedisService = {
    // Leaderboard
    getLeaderboard: (postId : string) => Promise<LeaderboardEntry[]>;
    updateLeaderboard: (postId : string, entry : LeaderboardEntry) => Promise<void>;

    //player Data
    saveUserGameData: (postId: string, userId: string, answers: PlayerAnswer[], totalScore: number, sessionData : PlayerSession) => Promise<void>;
    getPlayerRank: (postId: string, userId: string) => Promise<number | null>;
    getPlayerSession: (postId: string, userId: string) => Promise<PlayerSession | null>;

    //post
    getDeck: (postId: string) => Promise<Deck | null>;
    saveDeck: (postId: string, deck: Deck) => Promise<void>;

    //utils
    addQuestionToDeck: (postId: string, question: Question) => Promise<void>;
    editQuestionInDeck: (postId: string, updatedQuestion: Question) => Promise<void>; // New function
    deleteQuestionFromDeck: (postId: string, questionId: string) => Promise<void>; // New function


}


export function createRedisService(context: Devvit.Context|TriggerContext): RedisService {
    const { redis, realtime } = context;

    function calculateScoreForQuestion({
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
    }): number {
        // Updated to match the DebateDueler.tsx time bonus
        const baseTimeBonus = Math.max(0, timeRemaining);
        
        const getCardPercentage = (cardId: string): number => {
            if (!questionStats || questionStats.totalResponses === 0) return 0;
            const count = questionStats.cardStats[cardId] || 0;
            return Math.round((count / questionStats.totalResponses) * 100);
        };

        if (question.questionType === 'sequence') {
            const sequence = answer as string[];
            
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
                // NEW: Use positionStats for conformist/contrarian sequence scoring
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
    }

    return {

        getPlayerSession: async (postId: string, userId: string): Promise<PlayerSession | null> => {
            const sessionData = await redis.get(getPlayerSessionKey(postId, userId));
            console.log(`Retrieved player session for post ${postId} and user ${userId}`, sessionData);
            return sessionData ? JSON.parse(sessionData) as PlayerSession : null;
        },

        getLeaderboard: async (postId) => {
            const leaderboardKey = getLeaderboardKey(postId);
            // Get all entries with scores
            const allEntries = await redis.zRange(leaderboardKey, 0, -1);
            
            if (allEntries.length === 0) return [];
            
            // Sort entries by score descending
            const sortedEntries = [...allEntries].sort((a, b) => b.score - a.score);

            // Get top entries
            const topEntries = sortedEntries.slice(0, 10);
            
            const entries: LeaderboardEntry[] = [];
            
            // Fetch full entry data for each top entry
            for (const entry of topEntries) {
                const entryKey = `${leaderboardKey}:${entry.member}`;
                const entryData = await redis.get(entryKey);
                
                if (entryData) {
                    try {
                        entries.push(JSON.parse(entryData));
                    } catch (error) {
                        console.error(`Error parsing leaderboard entry: ${error}`);
                    }
                }
            }
            
            return entries;
        },

        saveUserGameData: async (postId: string, userId: string, answers: PlayerAnswer[], totalScore: number, session : PlayerSession) => {
            try {
                    const deckKey = getDeckKey(postId);
                    const deckData = await redis.get(deckKey);
                    if (!deckData) {
                    console.error(`No deck found for post ${postId}`);
                    return;
                    }
                    const deck: Deck = JSON.parse(deckData);

                    let finalScore = 0;
                    
                    for (const answer of answers) {
                    const question = deck.questions.find(q => q.id === answer.questionId);
                    if (!question) continue;

                    // Find or create stats for this question
                    if (!deck.questionStats) deck.questionStats = [];
                    let questionStats = deck.questionStats.find(s => s.questionId === question.id);
                    
                    if (!questionStats) {
                        questionStats = {
                        questionId: question.id,
                        cardStats: {},
                        positionStats: {},
                        totalResponses: 0
                        };
                        deck.questionStats.push(questionStats);
                    }
                    
                    // Update stats
                    questionStats.totalResponses++;
                    
                    if (typeof answer.answer === 'string') {
                        questionStats.cardStats[answer.answer] = 
                        (questionStats.cardStats[answer.answer] || 0) + 1;
                    } else {
                        // NEW: Update both cardStats and positionStats for sequence questions
                        if (!questionStats.positionStats) questionStats.positionStats = {};
                        for (let i = 0; i < answer.answer.length; i++) {
                            // CORRECTED: Added null/undefined check
                            const cardId = answer.answer[i];
                            if (cardId) {
                                // Update general card stats
                                questionStats.cardStats[cardId] = (questionStats.cardStats[cardId] || 0) + 1;
                                
                                // Update position-specific stats (1-based positions)
                                const position = i + 1;
                                if (!questionStats.positionStats[cardId]) {
                                    questionStats.positionStats[cardId] = {};
                                }
                                questionStats.positionStats[cardId][position] = (questionStats.positionStats[cardId][position] || 0) + 1;
                            }
                        }
                    }

                    // Calculate score
                    const questionScore = calculateScoreForQuestion({
                        scoringMode: session.scoringMode,
                        question,
                        answer: answer.answer,
                        questionStats,
                        timeRemaining: answer.timeRemaining,
                    });

                    finalScore += questionScore;
                }
                // Save updated deck with new stats
                await redis.set(deckKey, JSON.stringify(deck));
                //await redis.set(getDeckKey(postId), JSON.stringify(deck));

                // 4. Update session to finished state
                const finishedSession: PlayerSession = {
                    ...session,
                    answers,
                    totalScore: finalScore,
                    gameState: 'finished',
                    finishedAt: Date.now(),
                };

                await redis.set(
                    getPlayerSessionKey(postId, userId), 
                    JSON.stringify(finishedSession)
                );

                // 5. Update leaderboard
                const leaderboardKey = getLeaderboardKey(postId);
                const entryKey = `${leaderboardKey}:${userId}`;
                
                // Only add if not already exists
                if (!(await redis.exists(entryKey))) {
                    await redis.zAdd(leaderboardKey, {
                        score: finalScore,
                        member: userId
                    });
                    
                    await redis.set(entryKey, JSON.stringify({
                        userId,
                        username: finishedSession.username,
                        score: finalScore,
                        scoringMode: session.scoringMode,
                        completedAt: finishedSession.finishedAt,
                    }));
                }

                console.log(`Saved game data for user ${userId} on post ${postId} with score ${finalScore}`);
            } catch (error) {
                console.error(`Error saving game data: ${error}`);
            }
        },
 

        updateLeaderboard: async (postId , entry) => {
            const leaderboardKey = getLeaderboardKey(postId);
              
              // NEW: Check if user already has an entry
              const entryKey = `${leaderboardKey}:${entry.userId}`;
              const existingEntry = await redis.exists(entryKey);
              
              if (existingEntry) {
                console.log(`User ${entry.userId} already has a leaderboard entry. Skipping update.`);
                return;
              }
            
              console.log(`Updating leaderboard for post ${postId}:`, {
                userId: entry.userId,
                score: entry.score,
                username: entry.username
              });
              
              // Add entry to sorted set
              const zaddResult = await redis.zAdd(leaderboardKey, { score: entry.score, member: entry.userId });
              console.log(`zadd result: ${zaddResult}`);
              
              // Store full entry data
              const setResult = await redis.set(entryKey, JSON.stringify(entry));
              console.log(`set result: ${setResult}`);

        },


       addQuestionToDeck: async (postId: string, question: Question) => {
            try {
                // 1. Get current deck
                const deckKey = getDeckKey(postId);
                const deckData = await redis.get(deckKey);
                let deck: Deck = deckData ? JSON.parse(deckData) : null;
                
                // If no deck exists, create a default one
                if (!deck) {
                    deck = {
                        id: `deck_${Date.now()}`,
                        title: "Community Questions",
                        description: "Questions added by players",
                        theme: "custom",
                        questions: [],
                        createdBy: "Community",
                        createdAt: Date.now(),
                    };
                }
                
                // 2. Get username
                let username = "Anonymous";
                try {
                    username = await context.reddit.getCurrentUsername() || "Anonymous";
                } catch (error) {
                    console.error("Error getting username:", error);
                }
                
                // 3. Create new question with proper metadata
                const newQuestion: Question = {
                    ...question,
                    id: `user_${Date.now()}_${context.userId || 'anonymous'}`,
                    authorUsername: username,
                    timeLimit: question.timeLimit || 20,
                };
                
                // 4. Add to deck
                deck.questions.push(newQuestion);

                // Initialize stats array if needed
                if (!deck.questionStats) {
                    deck.questionStats = [];
                }
                
                // Create new stats entry
                const newStats: QuestionStats = {
                    questionId: newQuestion.id,
                    cardStats: {},
                    positionStats: {},
                    totalResponses: 0
                };
                
                // Initialize card stats
                newQuestion.cards.forEach(card => {
                    newStats.cardStats[card.id] = 0;
                });
                
                deck.questionStats.push(newStats);
                
                // Save updated deck
                await redis.set(deckKey, JSON.stringify(deck));
                
                console.log(`Added question ${newQuestion.id} to deck for post ${postId}`);
            } catch (error) {
                console.error(`Error adding question to deck: ${error}`);
            }
        },

        editQuestionInDeck: async (postId: string, updatedQuestion: Question) => {
            try {
                const deckKey = getDeckKey(postId);
                const deckData = await redis.get(deckKey);
                if (!deckData) {
                    console.error(`No deck found for post ${postId} to edit question.`);
                    return;
                }
                let deck: Deck = JSON.parse(deckData);

                const questionIndex = deck.questions.findIndex(q => q.id === updatedQuestion.id);
                if (questionIndex !== -1) {
                    deck.questions[questionIndex] = updatedQuestion;
                    await redis.set(deckKey, JSON.stringify(deck));
                    console.log(`Edited question ${updatedQuestion.id} in deck for post ${postId}`);
                } else {
                    console.warn(`Question with ID ${updatedQuestion.id} not found in deck for post ${postId}.`);
                }
            } catch (error) {
                console.error(`Error editing question in deck: ${error}`);
            }
        },

        deleteQuestionFromDeck: async (postId: string, questionId: string) => {
            try {
                const deckKey = getDeckKey(postId);
                const deckData = await redis.get(deckKey);
                if (!deckData) {
                    console.error(`No deck found for post ${postId} to delete question.`);
                    return;
                }
                let deck: Deck = JSON.parse(deckData);

                const initialLength = deck.questions.length;
                deck.questions = deck.questions.filter(q => q.id !== questionId);
                
                if (deck.questions.length < initialLength) {
                    // Also remove associated stats if they exist
                    if (deck.questionStats) {
                        deck.questionStats = deck.questionStats.filter(s => s.questionId !== questionId);
                    }
                    await redis.set(deckKey, JSON.stringify(deck));
                    console.log(`Deleted question ${questionId} from deck for post ${postId}`);
                } else {
                    console.warn(`Question with ID ${questionId} not found in deck for post ${postId}.`);
                }
            } catch (error) {
                console.error(`Error deleting question from deck: ${error}`);
            }
        },

        getPlayerRank: async (postId: string, userId: string): Promise<number | null> => {
            const leaderboardKey = `leaderboard:${postId}`;
            console.log(`Getting rank for user ${userId} in post ${postId}`);
            
            // Get all entries with scores
            const allEntries = await redis.zRange(leaderboardKey, 0, -1);
            
            if (allEntries.length === 0) return null;
            
            // Sort entries by score descending
            const sortedEntries = [...allEntries].sort((a, b) => b.score - a.score);
            
            // Find the index of the user in the sorted list
            const rankIndex = sortedEntries.findIndex(entry => entry.member === userId);
            
            if (rankIndex === -1) {
                console.log(`User ${userId} not found in leaderboard`);
                return null;
            }
            
            const rank = rankIndex + 1; // Convert to 1-based rank
            console.log(`Descending rank: ${rank}`);
            
            return rank;

        },

        saveDeck: async (postId: string, deck: Deck) => {
            await redis.set(getDeckKey(postId), JSON.stringify(deck));
            console.log(`Saved deck for post ${postId}`);
        },

        getDeck: async (postId: string): Promise<Deck | null> => {
            const deckData = await redis.get(getDeckKey(postId));
            return deckData ? JSON.parse(deckData) as Deck : null;
        },    
    }

};
