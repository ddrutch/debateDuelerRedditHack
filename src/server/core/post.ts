import { context, reddit, redis } from '@devvit/web/server';
import { Deck } from '../../shared/types/game';
import { saveDeck } from './game';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'debateduelerhack',
    },
    subredditName: subredditName,
    title: 'debateduelerhack',
  });
};

export const createPostWithDeck = async (deckData: Deck) => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  // Create the post with the deck title
  const post = await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'debateduelerhack',
    },
    subredditName: subredditName,
    title: `${deckData.title} by ${deckData.createdBy}`,
  });

  // Note: Post flair functionality would go here, but Devvit Web's setPostFlair
  // has different parameters than the original system. This can be added later
  // if the correct API parameters are determined.

  // Save the deck data to Redis using the new post ID
  await saveDeck({ redis, postId: post.id, deck: deckData });

  return post;
};
