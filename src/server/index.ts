import express, { Response } from 'express';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { UiResponse } from '@devvit/web/shared';
import { createPost, createPostWithDeck } from './core/post';
import { getDeck, saveDeck, getPlayerSession, updatePlayerSession, recordAnswer, getQuestionStats, updateLeaderboard, getLeaderboard, getPlayerRank } from './core/game';

// Helper function to load question stats for a deck
const loadQuestionStatsForDeck = async (redis: any, postId: string, deck: Deck): Promise<void> => {
  if (!deck.questionStats) {
    deck.questionStats = [];
  }

  for (const question of deck.questions) {
    // Check if stats already exist in deck
    let questionStats = deck.questionStats.find(s => s.questionId === question.id);

    if (!questionStats) {
      // Load stats from Redis
      const stats = await getQuestionStats({
        redis,
        postId,
        questionId: question.id,
        cardIds: question.cards.map(card => card.id),
      });

      // Only add if there are actual responses
      if (stats.totalResponses > 0) {
        deck.questionStats.push(stats);
      }
    }
  }
};
import { calculateScore } from '../shared/scoring';
import { getDefaultDeck } from './core/decks';
import { Deck, PlayerSession, PlayerAnswer, ScoringMode, Question, QuestionStats, LeaderboardEntry } from '../shared/types/game';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get('/api/init', async (_req, res): Promise<void> => {
  const { postId, userId } = context;

  if (!postId) {
    res.status(400).json({ status: 'error', message: 'Post ID is required' });
    return;
  }

  try {
    // Get or create deck for this post
    let deck = await getDeck({ redis, postId });
    if (!deck) {
      deck = getDefaultDeck();
      await saveDeck({ redis, postId, deck });
    }

    // Shuffle the deck and limit to 10 questions
    deck.questions = deck.questions.sort(() => Math.random() - 0.5).slice(0, 10);

    // Load question stats for the shuffled questions
    await loadQuestionStatsForDeck(redis, postId, deck);

    // Get existing player session if user is logged in
    let playerSession = null;
    let playerRank = null;
    let isAdmin = false;

    if (userId) {
      playerSession = await getPlayerSession({ redis, postId, userId });
      playerRank = await getPlayerRank({ redis, postId, userId });

      // Check if user is admin
      const subredditName = context.subredditName;
      if (subredditName) {
        const user = await reddit.getCurrentUser();
        if (user) {
          const permissions = await user.getModPermissionsForSubreddit(subredditName);
          isAdmin = permissions && permissions.length > 0;
        }
      }
    }

    const username = await reddit.getCurrentUsername() || 'Anonymous';

    res.json({
      postId,
      deck,
      playerSession,
      playerRank,
      userId: userId || 'anonymous',
      username,
      isAdmin,
    });
  } catch (error) {
    console.error('Init game error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to initialize game',
    });
  }
});

// Complete game endpoint
router.post('/api/complete-game', async (req, res): Promise<void> => {
  const { answers, totalScore, sessionData } = req.body;
  const { postId, userId } = context;

  if (!postId || !userId) {
    res.status(400).json({ status: 'error', message: 'Must be logged in to complete game' });
    return;
  }

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    res.status(400).json({ status: 'error', message: 'Valid answers required' });
    return;
  }

  try {
    const deck = await getDeck({ redis, postId });
    if (!deck) {
      res.status(404).json({ status: 'error', message: 'Game deck not found' });
      return;
    }

    // Process all answers and calculate accurate scores
    let finalScore = 0;

    for (const answer of answers) {
      const question = deck.questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      // Record answer in stats for community voting
      await recordAnswer({
        redis,
        postId,
        questionId: question.id,
        answer: answer.answer
      });

      // Get updated stats for accurate scoring
      const questionStats = await getQuestionStats({
        redis,
        postId,
        questionId: question.id,
        cardIds: question.cards.map(card => card.id),
      });

      // Calculate accurate score with real community data
      const questionScore = calculateScore({
        scoringMode: sessionData.scoringMode,
        question,
        answer: answer.answer,
        questionStats,
        timeRemaining: answer.timeRemaining,
      });

      finalScore += questionScore;
    }

    // Update session to finished state
    const finishedSession = {
      ...sessionData,
      answers,
      totalScore: finalScore,
      gameState: 'finished' as const,
      finishedAt: Date.now(),
    };

    await updatePlayerSession({ redis, postId, session: finishedSession });

    // Update leaderboard
    const leaderboardUpdated = await updateLeaderboard({
      redis,
      postId,
      entry: {
        userId: sessionData.userId,
        username: sessionData.username,
        score: finalScore,
        scoringMode: sessionData.scoringMode,
        completedAt: finishedSession.finishedAt,
      },
    });

    res.json({
      status: 'success',
      finalScore,
      session: finishedSession,
      leaderboardUpdated,
    });
  } catch (error) {
    console.error('Complete game error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete game',
    });
  }
});

// Get leaderboard
router.get('/api/leaderboard', async (req, res): Promise<void> => {
  const { postId, userId } = context;
  const { type = 'top' } = req.query;

  if (!postId) {
    res.status(400).json({
      status: 'error',
      message: 'Post ID is required',
    });
    return;
  }

  try {
    const leaderboard = await getLeaderboard({
      redis,
      postId,
      type: type as 'top' | 'near',
      userId: type === 'near' ? userId : undefined,
      limit: 15
    });

    let playerRank = null;
    let playerScore = null;

    if (userId) {
      playerRank = await getPlayerRank({ redis, postId, userId });
      const session = await getPlayerSession({ redis, postId, userId });
      if (session) {
        playerScore = session.totalScore;
      }
    }

    res.json({
      leaderboard,
      playerRank,
      playerScore,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get leaderboard',
    });
  }
});

// Add question to existing deck
router.post('/api/add-question', async (req, res): Promise<void> => {
  const { question } = req.body;
  const { postId, userId } = context;

  if (!postId || !userId) {
    res.status(400).json({
      status: 'error',
      message: 'Must be logged in to add questions',
    });
    return;
  }

  if (!question || !question.prompt || !question.cards || question.cards.length < 2) {
    res.status(400).json({
      status: 'error',
      message: 'Valid question with at least 2 cards is required',
    });
    return;
  }

  try {
    const deck = await getDeck({ redis, postId });
    if (!deck) {
      res.status(404).json({
        status: 'error',
        message: 'Game deck not found',
      });
      return;
    }

    // Add author attribution and generate ID
    const username = await reddit.getCurrentUsername() || 'Anonymous';
    const newQuestion: Question = {
      ...question,
      id: `user_${Date.now()}_${userId}`,
      authorUsername: username,
      timeLimit: question.timeLimit || 20,
    };

    deck.questions.push(newQuestion);
    await saveDeck({ redis, postId, deck });

    res.json({
      status: 'success',
      questionId: newQuestion.id,
    });
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add question',
    });
  }
});

// Edit question in deck
router.post('/api/edit-question', async (req, res): Promise<void> => {
  const { question } = req.body;
  const { postId } = context;

  if (!postId) {
    res.status(400).json({
      status: 'error',
      message: 'Post ID is required',
    });
    return;
  }

  try {
    const deck = await getDeck({ redis, postId });
    if (!deck) {
      res.status(404).json({
        status: 'error',
        message: 'Game deck not found',
      });
      return;
    }

    const questionIndex = deck.questions.findIndex(q => q.id === question.id);
    if (questionIndex === -1) {
      res.status(404).json({
        status: 'error',
        message: 'Question not found',
      });
      return;
    }

    deck.questions[questionIndex] = question;
    await saveDeck({ redis, postId, deck });

    res.json({
      status: 'success',
    });
  } catch (error) {
    console.error('Edit question error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to edit question',
    });
  }
});

// Delete question from deck
router.post('/api/delete-question', async (req, res): Promise<void> => {
  const { questionId } = req.body;
  const { postId } = context;

  if (!postId) {
    res.status(400).json({
      status: 'error',
      message: 'Post ID is required',
    });
    return;
  }

  try {
    const deck = await getDeck({ redis, postId });
    if (!deck) {
      res.status(404).json({
        status: 'error',
        message: 'Game deck not found',
      });
      return;
    }

    deck.questions = deck.questions.filter(q => q.id !== questionId);
    await saveDeck({ redis, postId, deck });

    res.json({
      status: 'success',
    });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete question',
    });
  }
});

// Get post data (for refreshing)
router.get('/api/post-data', async (_req, res): Promise<void> => {
  const { postId, userId } = context;

  if (!postId) {
    res.status(400).json({ status: 'error', message: 'Post ID is required' });
    return;
  }

  try {
    let deck = await getDeck({ redis, postId });
    if (!deck) {
      deck = getDefaultDeck();
      await saveDeck({ redis, postId, deck });
    }

    // Shuffle the deck and limit to 10 questions
    deck.questions = deck.questions.sort(() => Math.random() - 0.5).slice(0, 10);

    // Load question stats for the shuffled questions
    await loadQuestionStatsForDeck(redis, postId, deck);

    let playerSession = null;
    let playerRank = null;
    let isAdmin = false;

    if (userId) {
      playerSession = await getPlayerSession({ redis, postId, userId });
      playerRank = await getPlayerRank({ redis, postId, userId });

      const subredditName = context.subredditName;
      if (subredditName) {
        const user = await reddit.getCurrentUser();
        if (user) {
          const permissions = await user.getModPermissionsForSubreddit(subredditName);
          isAdmin = permissions && permissions.length > 0;
        }
      }
    }

    const username = await reddit.getCurrentUsername() || 'Anonymous';

    res.json({
      postId,
      deck,
      playerSession,
      playerRank,
      userId: userId || 'anonymous',
      username,
      isAdmin,
    });
  } catch (error) {
    console.error('Get post data error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get post data',
    });
  }
});

// Create post with deck data
router.post('/api/create-post', async (req, res): Promise<void> => {
  const { postData } = req.body;

  if (!postData) {
    res.status(400).json({ status: 'error', message: 'Deck data is required' });
    return;
  }

  try {
    const post = await createPostWithDeck(postData);
    res.json({
      status: 'success',
      postId: post.id,
      postUrl: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      showToast: {
        text: 'Created post!',
        appearance: 'success'
      },
      navigateTo: post
    });
  } catch (error) {
    console.error('Create post with deck error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create post with deck data',
    });
  }
});

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/clear-redis', async (_req, res: Response<UiResponse>): Promise<void> => {
  try {
    // Fetch all tracked keys
    const trackedKeysRaw = await redis.hGetAll('app:keys');
    const keys = Object.keys(trackedKeysRaw);

    if (keys && keys.length > 0) {
      // Delete all tracked keys
      await Promise.all(keys.map((k) => redis.del(k)));
    }

    // Clear the tracking hash itself
    await redis.del('app:keys');

    res.json({
      showToast: { text: 'Redis cleared for this subreddit install.', appearance: 'success' }
    });
  } catch (err) {
    console.error('Error clearing Redis:', err);
    res.json({
      showToast: { text: 'Failed to clear Redis. Check server logs.', appearance: 'neutral' }
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
