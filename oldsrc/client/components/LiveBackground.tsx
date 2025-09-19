import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  EmotionalTier,
  TierName,
  getTierByName,
  getTierByPercentage,
} from '../../shared/data/emoticons';

interface MorphingState {
  targetText: string;
  progress: number; // 0..1
  duration: number; // seconds
}

interface EmoticonInstance {
  id: string;
  text: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  rotation: number;
  velocity: {
    x: number;
    y: number;
  };
  isChar: boolean;
  morphing: MorphingState | null;
}

interface LiveBackgroundProps {
  percentage?: number;
  isContrarian?: boolean;
  glowColor?: string;
  isActive?: boolean;
  tintStyle?: React.CSSProperties | undefined;
  showResults?: boolean;
}

export const LiveBackground: React.FC<LiveBackgroundProps> = ({
  percentage = 0,
  isContrarian = false,
  glowColor,
  isActive = true,
  tintStyle,
  showResults = false,
}) => {
  const [emoticons, setEmoticons] = useState<EmoticonInstance[]>([]);
  const [currentTier, setCurrentTier] = useState<EmotionalTier | undefined>(undefined);
  const [glowOpacity, setGlowOpacity] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);

  // Memoized glow color (used in render)
  const memoizedGlowColor = useMemo(() => {
    if (glowColor) return glowColor;
    return currentTier ? currentTier.color : '#ffffff';
  }, [currentTier, glowColor, showResults]);

  // Determine emotional tier based on game state
  useEffect(() => {
    if (!isActive) return;

    let tier: EmotionalTier | undefined;
    
    // Only update the tier if a card has been selected (percentage > 0)
    if (percentage > 0) {
      tier = getTierByPercentage(percentage, isContrarian);
    } else {
      // Default to neutral when no card is selected
      tier = getTierByName('neutral');
    }

    if (tier) {
      setCurrentTier(tier);
      // Set glow opacity based on how extreme the result is
      const intensity = Math.abs((percentage / 100) - 0.5) * 2; // 0 to 1 scale
      setGlowOpacity(0.4 + (intensity * 0.5));
    }
  }, [percentage, isContrarian, isActive]);

  // compute reaction scalar [-1..1]
  const computeReaction = (): number => {
    if (typeof percentage === 'number') {
      const p = Math.max(0, Math.min(100, percentage)) / 100;
      return isContrarian ? (0.5 - p) * 2 : (p - 0.5) * 2;
    }
    return 0;
  };

  // When results / props change: derive tier and morph items
  useEffect(() => {
    if (!currentTier || !isActive) return;

    const reaction = computeReaction();
    const fractionToMorph = Math.min(0.9, 0.35 + Math.abs(reaction) * 0.6);

    setGlowOpacity(0.85); // pulse

    setEmoticons(prev => {
      if (prev.length === 0) return prev;

      const emoticonsOnly = prev.filter(e => !e.isChar);
      const charsOnly = prev.filter(e => e.isChar);

      const pickN = (arrLength: number, frac: number) => Math.max(1, Math.floor(arrLength * frac));
      const pickIndices = (len: number, n: number) => {
        const indices = Array.from({ length: len }, (_, i) => i);
        indices.sort(() => Math.random() - 0.5);
        return indices.slice(0, Math.min(n, len));
      };

      const newArr = [...prev];

      // dominant emoticons
      const nEmoticons = pickN(emoticonsOnly.length, fractionToMorph);
      const emoticonIdxs = pickIndices(emoticonsOnly.length, nEmoticons);
      for (const idx of emoticonIdxs) {
        const instance = emoticonsOnly[idx];
        if (!instance) continue;
        const globalIndex = newArr.findIndex(x => x.id === instance.id);
        if (globalIndex < 0) continue;

        const base = newArr[globalIndex]!;
        newArr[globalIndex] = {
          ...base,
          morphing: {
            targetText: getRandomEmoticon(currentTier, false),
            progress: 0,
            duration: 0.28 + Math.random() * 0.32,
          },
          scale: base.scale * (1 + 0.12 * Math.abs(reaction)),
          opacity: 1,
        };
      }

      // small chars
      const nChars = pickN(charsOnly.length, Math.max(0.12, fractionToMorph * 0.6));
      const charIdxs = pickIndices(charsOnly.length, nChars);
      for (const idx of charIdxs) {
        const instance = charsOnly[idx];
        if (!instance) continue;
        const globalIndex = newArr.findIndex(x => x.id === instance.id);
        if (globalIndex < 0) continue;

        const base = newArr[globalIndex]!;
        newArr[globalIndex] = {
          ...base,
          morphing: {
            targetText: getRandomEmoticon(currentTier, true),
            progress: 0,
            duration: 0.2 + Math.random() * 0.25,
          },
          scale: base.scale * (1 + 0.06 * Math.abs(reaction)),
          opacity: 1,
        };
      }

      return newArr;
    });

    setTimeout(() => setGlowOpacity(isActive ? 0.4 : 0), 900);
  }, [currentTier, isActive]);

  // initialize items when a tier becomes active
  useEffect(() => {
    if (!containerRef.current || !currentTier || !isActive) return;

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();

    const initial: EmoticonInstance[] = [];
    const totalEmoticons = 18;
    const totalChars = 6;

    for (let i = 0; i < totalEmoticons; i++) {
      const emoticon = getRandomEmoticon(currentTier, false);
      const angleDeg = 70 + Math.random() * 20;
      const angle = (angleDeg * Math.PI) / 180;
      const speed = 0.6 + Math.random() * 1.0;
      initial.push({
        id: `emoticon-${Date.now()}-${i}`,
        text: emoticon,
        x: Math.random() * width,
        y: height + Math.random() * 160,
        scale: 1.0 + Math.random() * 0.5,
        opacity: 0.65 + Math.random() * 0.35,
        rotation: Math.random() * 8 - 4,
        velocity: { x: Math.cos(angle) * speed, y: -Math.sin(angle) * (1.0 + Math.random() * 0.6) },
        isChar: false,
        morphing: null,
      });
    }

    for (let i = 0; i < totalChars; i++) {
      const ch = getRandomEmoticon(currentTier, true);
      const angleDeg = 70 + Math.random() * 20;
      const angle = (angleDeg * Math.PI) / 180;
      const speed = 0.8 + Math.random() * 1.4;
      initial.push({
        id: `char-${Date.now()}-${i}`,
        text: ch,
        x: Math.random() * width,
        y: height + Math.random() * 160,
        scale: 0.8 + Math.random() * 0.6,
        opacity: 0.6 + Math.random() * 0.4,
        rotation: Math.random() * 24 - 12,
        velocity: { x: Math.cos(angle) * (speed * 0.6), y: -Math.sin(angle) * (0.8 + Math.random() * 0.8) },
        isChar: true,
        morphing: null,
      });
    }

    setEmoticons(initial);
  }, [currentTier, isActive]);

  // animation loop
  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const animate = (timestamp: number) => {
      if (!containerRef.current) return;
      if (timestamp - lastUpdateTime.current < 16) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      const dt = Math.min(0.06, (timestamp - lastUpdateTime.current) / 1000);
      lastUpdateTime.current = timestamp;
      const { width, height } = containerRef.current.getBoundingClientRect();

      setEmoticons(prev =>
        prev.map(e => {
          let newX = e.x + e.velocity.x * dt * 90;
          let newY = e.y + e.velocity.y * dt * 90;

          if (newY < -140 || newX > width + 200 || newX < -200) {
            newX = Math.random() * width;
            newY = height + Math.random() * 80;
            e.rotation = Math.random() * (e.isChar ? 24 : 10) - (e.isChar ? 12 : 5);
            e.scale = e.isChar ? 0.8 + Math.random() * 0.8 : 0.9 + Math.random() * 0.6;
            e.opacity = 0.6 + Math.random() * 0.4;
            e.morphing = null;
          }

          let morphing = e.morphing;
          let newText = e.text;
          let newScale = e.scale;
          let newOpacity = e.opacity;

          if (morphing) {
            const progress = Math.min(1, morphing.progress + dt / Math.max(0.001, morphing.duration));
            morphing = { ...morphing, progress };
            if (progress >= 1) {
              newText = morphing.targetText;
              morphing = null;
            } else {
              newScale = e.scale * (1 + 0.12 * (1 - Math.abs(progress - 0.5) * 2));
            }
            newOpacity = 0.85;
          }

          return {
            ...e,
            x: newX,
            y: newY,
            morphing,
            text: newText,
            scale: newScale,
            opacity: newOpacity,
          };
        })
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    lastUpdateTime.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive]);

  // small burst on strong reactions
  useEffect(() => {
    if (!currentTier || !isActive || !containerRef.current) return;
    const reaction = computeReaction();
    const burstCount = Math.round(Math.abs(reaction) * 6);
    if (burstCount <= 0) return;

    const { width, height } = containerRef.current.getBoundingClientRect();
    setEmoticons(prev => {
      const additions: EmoticonInstance[] = [];
      for (let i = 0; i < burstCount; i++) {
        const isChar = Math.random() > 0.78;
        const emoticon = getRandomEmoticon(currentTier, isChar);
        const angleDeg = 70 + Math.random() * 20;
        const angle = (angleDeg * Math.PI) / 180;
        const speed = 1.2 + Math.random() * 1.8;
        additions.push({
          id: `burst-${Date.now()}-${i}`,
          text: emoticon,
          x: width * (0.2 + Math.random() * 0.6),
          y: height * (0.4 + Math.random() * 0.2),
          scale: isChar ? 0.6 : 1.2,
          opacity: 0.0,
          rotation: Math.random() * (isChar ? 30 : 10) - (isChar ? 15 : 5),
          velocity: { x: Math.cos(angle) * (speed * 0.6), y: -Math.sin(angle) * (0.6 + Math.random()) },
          isChar,
          morphing: null,
        });
      }
      return [...prev, ...additions];
    });

    setTimeout(() => {
      setEmoticons(prev =>
        prev.map(e =>
          e.id.startsWith('burst-')
            ? { ...e, opacity: 0.75, scale: e.isChar ? 0.9 + Math.random() * 0.5 : 1.4 + Math.random() * 0.6 }
            : e
        )
      );
    }, 40);
  }, [currentTier, isActive]);

  // weighted picker
  const getRandomEmoticon = (tier: EmotionalTier, isChar: boolean): string => {
    const collection = isChar ? tier.chars : tier.emoticons;
    if (!collection || collection.length === 0) return isChar ? '😐' : '(・_・)';
    const totalWeight = collection.reduce((sum, item) => sum + (typeof (item as any).weight === 'number' ? (item as any).weight : 1), 0);
    let random = Math.random() * totalWeight;
    for (const item of collection) {
      const weight = typeof (item as any).weight === 'number' ? (item as any).weight : 1;
      if (random < weight) return (item as any).text;
      random -= weight;
    }
    return (collection[0] as any).text;
  };

  // render
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none z-[-1]"
      style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[30vh] transition-opacity duration-400 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top, ${memoizedGlowColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')}, transparent 70%)`,
          opacity: isActive ? 1 : 0,
          pointerEvents: 'none',
        }}
      />

      {emoticons.map(e => (
        <div
          key={e.id}
          className="absolute transition-transform duration-150 will-change-transform,opacity"
          style={{
            left: `${e.x}px`,
            top: `${e.y}px`,
            transform: `translate(-50%,-50%) scale(${e.scale}) rotate(${e.rotation}deg)`,
            opacity: e.opacity * (isActive ? 1 : 0),
            fontSize: e.isChar ? '1.1rem' : '1.9rem',
            color: 'white',
            textShadow: '0 0 6px rgba(0,0,0,0.45)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {e.text}
        </div>
      ))}
    </div>
  );
};