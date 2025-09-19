// src/components/MainScreen.tsx
import { Devvit } from '@devvit/public-api';
import { HeroButton } from './HeroButton';
import { Deck } from '../../shared/types/redditTypes';

interface MainScreenProps {
  onPlayPress: () => void;
  deck?: Deck;
}

export const MainScreen: Devvit.BlockComponent<MainScreenProps> = ({ onPlayPress, deck }) => {
  return (
    <zstack width="100%" height="100%" alignment="center middle">
      {/* Background */}
      <image
        imageHeight={1024}
        imageWidth={1500}
        height="100%"
        width="100%"
        url="background2.png"
        description="Striped blue background"
        resizeMode="cover"
      />

      {/* Main content stack */}
      <vstack alignment="center" grow>
        {/* Logo at the top-middle */}
        <vstack alignment="top" height="100%" padding="small">
          <image
            url="logo.png"
            description="Logo"
            height="140px"
            width="140px"
            imageHeight="240px"
            imageWidth="240px"
          />
        </vstack>

        {/* Title at the top-middle */}
        <vstack alignment="top center" height="15%">
          <text size="xxlarge" weight="bold" outline="thick" color="white" alignment="center">
            {deck?.title}
          </text>
        </vstack>

        {/* Description in the middle */}
        <vstack alignment="middle center" height="40%" padding="large">
          <text size="large" weight="regular" color="white" alignment="center" wrap>
            {deck?.description}
          </text>
        </vstack>

        {/* HeroButton at the bottom */}
        <vstack alignment="bottom center" height="25%">
          <HeroButton
            label="Start the Duel"
            onPress={onPlayPress}
            animated
          />
        </vstack>
      </vstack>
    </zstack>
  );
};