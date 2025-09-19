import { RedisClient } from '@devvit/redis';
import {
  PlayerSession,
  PlayerAnswer,
  ScoringMode,
  QuestionStats,
  Question,
  LeaderboardEntry,
  Deck
} from '../../shared/types/game';

// Redis key generators
export const getPlayerSessionKey = (postId: string, userId: string) => `game:${postId}:player:${userId}`;
export const getQuestionStatsKey = (postId: string, questionId: string) => `stats:${postId}:${questionId}`;
export const getLeaderboardKey = (postId: string) => `leaderboard:${postId}`;
export const getDeckKey = (postId: string) => `deck:${postId}`;

// Helper function to track Redis keys for clearing
const trackRedisKey = async (redis: RedisClient, key: string): Promise<void> => {
  await redis.hSet('app:keys', { [key]: '1' });
};

export const initPlayerSession = async ({
  redis,
  postId,
  userId,
  username,
  scoringMode,
  deck,
}: {
  redis: RedisClient;
  postId: string;
  userId: string;
  username: string;
  scoringMode: ScoringMode;
  deck: Deck;
}): Promise<PlayerSession> => {
  const session: PlayerSession = {
    userId,
    username,
    scoringMode,
    answers: [],
    totalScore: 0,
    currentQuestionIndex: 0,
    gameState: 'playing',
    startedAt: Date.now(),
  };

  const key = getPlayerSessionKey(postId, userId);
  await redis.set(key, JSON.stringify(session));
  await trackRedisKey(redis, key);
  return session;
};

export const getPlayerSession = async ({
  redis,
  postId,
  userId,
}: {
  redis: RedisClient;
  postId: string;
  userId: string;
}): Promise<PlayerSession | null> => {
  const sessionData = await redis.get(getPlayerSessionKey(postId, userId));
  return sessionData ? JSON.parse(sessionData) : null;
};

export const updatePlayerSession = async ({
  redis,
  postId,
  session,
}: {
  redis: RedisClient;
  postId: string;
  session: PlayerSession;
}): Promise<void> => {
  const key = getPlayerSessionKey(postId, session.userId);
  await redis.set(key, JSON.stringify(session));
  await trackRedisKey(redis, key);
};

export const recordAnswer = async ({
  redis,
  postId,
  questionId,
  answer,
}: {
  redis: RedisClient;
  postId: string;
  questionId: string;
  answer: string | string[];
}): Promise<void> => {
  const statsKey = getQuestionStatsKey(postId, questionId);
  const totalKey = `${statsKey}:total`;

  // Increment total responses
  await redis.incrBy(totalKey, 1);

  if (typeof answer === 'string') {
    // Single card answer
    await redis.hIncrBy(statsKey, answer, 1);
  } else {
    // Sequence answer - increment each card
    for (const cardId of answer) {
      await redis.hIncrBy(statsKey, cardId, 1);
    }
  }

  // Track the keys
  await trackRedisKey(redis, statsKey);
  await trackRedisKey(redis, totalKey);
};

export const getQuestionStats = async ({
  redis,
  postId,
  questionId,
  cardIds,
}: {
  redis: RedisClient;
  postId: string;
  questionId: string;
  cardIds: string[];
}): Promise<QuestionStats> => {
  const statsKey = getQuestionStatsKey(postId, questionId);
  
  // Get all card stats at once
  const cardStatsRaw = await redis.hGetAll(statsKey);
  const cardStats: Record<string, number> = {};
  
  // Convert string values to numbers
  for (const [cardId, count] of Object.entries(cardStatsRaw)) {
    cardStats[cardId] = parseInt(count) || 0;
  }
  
  // Get total responses
  const totalResponses = await redis.get(`${statsKey}:total`);
  
  return {
    questionId,
    cardStats,
    totalResponses: totalResponses ? parseInt(totalResponses) : 0,
  };
};

function calculateSequenceSimilarity(seqA: string[], seqB: string[]): number {
  let matches = 0;
  for (let i = 0; i < Math.min(seqA.length, seqB.length); i++) {
    if (seqA[i] === seqB[i]) matches++;
  }
  return matches / Math.max(seqA.length, seqB.length);
}

export const updateLeaderboard = async ({
  redis,
  postId,
  entry,
}: {
  redis: RedisClient;
  postId: string;
  entry: LeaderboardEntry;
}): Promise<boolean> => {
  const leaderboardKey = getLeaderboardKey(postId);

  // Check if user already has an entry
  const entryKey = `${leaderboardKey}:${entry.userId}`;
  const existingEntry = await redis.exists(entryKey);

  if (existingEntry) {
    console.log(`User ${entry.userId} already has a leaderboard entry. Skipping update.`);
    return false;
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

  // Track the keys
  await trackRedisKey(redis, leaderboardKey);
  await trackRedisKey(redis, entryKey);

  return true;
};

export const getLeaderboard = async ({
  redis,
  postId,
  type = 'top',
  userId,
  limit = 15,
}: {
  redis: RedisClient;
  postId: string;
  type?: 'top' | 'near';
  userId?: string | undefined;
  limit?: number;
}): Promise<LeaderboardEntry[]> => {
  const leaderboardKey = getLeaderboardKey(postId);

  console.log(`Fetching leaderboard for post ${postId}, type: ${type}, userId: ${userId}`);

  // Get all entries with scores
  const allEntries = await redis.zRange(leaderboardKey, 0, -1);
  console.log(`All entries in leaderboard:`, allEntries);

  // If no entries, return empty array
  if (allEntries.length === 0) {
    console.log('No leaderboard entries found');
    return [];
  }

  // Sort entries by score descending
  const sortedEntries = [...allEntries].sort((a, b) => b.score - a.score);

  let selectedEntries: typeof sortedEntries = [];

  if (type === 'top') {
    // Get top entries
    selectedEntries = sortedEntries.slice(0, limit);
  } else if (type === 'near' && userId) {
    // Find user's position
    const userIndex = sortedEntries.findIndex(entry => entry.member === userId);
    if (userIndex === -1) {
      // User not found, return top entries as fallback
      selectedEntries = sortedEntries.slice(0, limit);
    } else {
      // Get 7 above and 7 below (including user)
      const start = Math.max(0, userIndex - 7);
      const end = Math.min(sortedEntries.length, userIndex + 8); // +8 because slice end is exclusive
      selectedEntries = sortedEntries.slice(start, end);
    }
  } else {
    // Default to top
    selectedEntries = sortedEntries.slice(0, limit);
  }

  console.log(`Selected entries:`, selectedEntries);

  const entries: LeaderboardEntry[] = [];

  // Fetch full entry data for each selected entry
  for (const entry of selectedEntries) {
    const entryKey = `${leaderboardKey}:${entry.member}`;
    console.log(`Fetching entry for ${entry.member} from key ${entryKey}`);

    const entryData = await redis.get(entryKey);

    if (entryData) {
      try {
        const fullEntry = JSON.parse(entryData);
        console.log(`Found entry for ${entry.member}:`, fullEntry);
        entries.push(fullEntry);
      } catch (error) {
        console.error(`Error parsing leaderboard entry for ${entry.member}:`, error);
      }
    } else {
      console.warn(`No entry data found for ${entry.member}`);
    }
  }

  console.log(`Returning ${entries.length} leaderboard entries`);
  return entries;
};

export const getPlayerRank = async ({
  redis,
  postId,
  userId,
}: {
  redis: RedisClient;
  postId: string;
  userId: string;
}): Promise<number | null> => {
  const leaderboardKey = getLeaderboardKey(postId);
  
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
};

export const saveDeck = async ({
  redis,
  postId,
  deck,
}: {
  redis: RedisClient;
  postId: string;
  deck: Deck;
}): Promise<void> => {
  const key = getDeckKey(postId);
  await redis.set(key, JSON.stringify(deck));
  await trackRedisKey(redis, key);
};

export const getDeck = async ({
  redis,
  postId,
}: {
  redis: RedisClient;
  postId: string;
}): Promise<Deck | null> => {
  const deckData = await redis.get(getDeckKey(postId));
  return deckData ? JSON.parse(deckData) : null;
};