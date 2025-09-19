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
      appDisplayName: 'Debate Dueler',
      backgroundUri: 'background.png',
      appIconUri: 'logo.png',
      description: deckData.description,
      heading: deckData.title,
      buttonLabel: 'Start the Duel',
    },
    subredditName: subredditName,
    title: `${deckData.title} by ${deckData.createdBy}`,
  });


  // await reddit.setPostFlair({
  //   postId: post.id,
  //   subredditName,
  //   flairTemplateId: '43a728c2-90b1-11f0-a3d7-725bb7b9ec89',
  //   text: deckData.flairText ?? 'not defined',
  //   // You can also pass backgroundColor | textColor | cssClass if needed
  // });

  // Save the deck data to Redis using the new post ID
  await saveDeck({ redis, postId: post.id, deck: deckData });

  return post;
};
