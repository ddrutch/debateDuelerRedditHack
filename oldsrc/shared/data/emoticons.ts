// emoticons.ts
export type TierName = 'toxic' | 'disgust' | 'neutral' | 'supportive' | 'ecstatic';

export type TierItem = {
  text: string;
  weight?: number;
};

export interface EmotionalTier {
  name: TierName;
  color: string; // hex or css color used for glow
  emoticons: TierItem[]; // large multi-char emoticons (dominant)
  chars: TierItem[];     // small single-codepoint pictographic chars (accents)
}

export const emotionalTiers: EmotionalTier[] = [
  {
    name: 'toxic',
    color: '#e74c3c',
    emoticons: [
      { text: '!@#$%', weight: 1 },
      { text: '(╬ಠ益ಠ)', weight: 1 },
      { text: '(ノಠ益ಠ)ノ', weight: 0.8 },
    ],
    chars: [
      { text: '💀', weight: 1 },
      { text: '☠', weight: 0.8 },
      { text: '💩', weight: 0.6 },
    ],
  },
  {
    name: 'disgust',
    color: '#f39c12',
    emoticons: [
      { text: '>:( ', weight: 1 },
      { text: '(ಠ_ಠ)', weight: 0.9 },
      { text: '(╯°□°）╯︵ ┻━┻', weight: 0.5 },
    ],
    chars: [
      { text: '😠', weight: 1 },
      { text: '🤢', weight: 0.6 },
    ],
  },
  {
    name: 'neutral',
    color: '#f1c40f',
    emoticons: [
      { text: '(-_-)', weight: 1 },
      { text: '¯\\_(ツ)_/¯', weight: 1 },
      { text: '(・_・)', weight: 0.8 },
    ],
    chars: [
      { text: '😐', weight: 1 },
      { text: '😑', weight: 0.8 },
    ],
  },
  {
    name: 'supportive',
    color: '#9bca3e',
    emoticons: [
      { text: '(ᵔᗜᵔ)◝', weight: 1 },
      { text: '(•‿•)', weight: 0.9 },
      { text: '(＾▽＾)', weight: 0.7 },
    ],
    chars: [
      { text: '🙂', weight: 1 },
      { text: '👍', weight: 0.9 },
      { text: '👏', weight: 0.8 },
    ],
  },
  {
    name: 'ecstatic',
    color: '#2ecc71',
    emoticons: [
      { text: '٩(◕‿◕)۶', weight: 1 },
      { text: '◝(ᵔᗜᵔ)◜', weight: 1 },
      { text: '（＾ｖ＾）', weight: 0.6 },
    ],
    chars: [
      { text: '🎉', weight: 1 },
      { text: '😄', weight: 0.9 },
      { text: '✨', weight: 0.7 },
    ],
  },
];

// Safe lookup by name (may return undefined if data missing)
export const getTierByName = (name: TierName): EmotionalTier | undefined => {
  return emotionalTiers.find(tier => tier.name === name);
};

// Helper: return a safe EmotionalTier (never undefined) — fallback to neutral if data missing
const pick = (name: TierName): EmotionalTier => {
  return getTierByName(name) ?? (emotionalTiers.find(t => t.name === 'neutral') as EmotionalTier);
};

// Map percentage -> tier (conformist/contrarian)
export const getTierByPercentage = (percentage: number, isContrarian: boolean = false): EmotionalTier => {
  const adjusted = isContrarian ? 100 - percentage : percentage;
  if (adjusted >= 80) return pick('ecstatic');
  if (adjusted >= 60) return pick('supportive');
  if (adjusted >= 40) return pick('neutral');
  if (adjusted >= 20) return pick('disgust');
  return pick('toxic');
};

// Map correctness -> tier (trivia mode)
export const getTierByCorrectness = (isCorrect: boolean): EmotionalTier => {
  return isCorrect ? pick('ecstatic') : pick('toxic');
};