import { FadeIn } from 'react-native-reanimated';

type MotionDirection = 'up' | 'down' | 'left' | 'right';

const distance = 10;

export const motionTokens = {
  duration: {
    fast: 180,
    base: 240,
    slow: 320,
  },
  spring: {
    soft: { damping: 18, stiffness: 180 },
    snappy: { damping: 14, stiffness: 220 },
  },
} as const;

function initialTransform(direction: MotionDirection) {
  switch (direction) {
    case 'down':
      return [{ translateY: -distance }];
    case 'left':
      return [{ translateX: distance }];
    case 'right':
      return [{ translateX: -distance }];
    case 'up':
    default:
      return [{ translateY: distance }];
  }
}

export const motion = {
  sheetEnter: () =>
    FadeIn.duration(motionTokens.duration.base)
      .springify()
      .damping(motionTokens.spring.soft.damping)
      .stiffness(motionTokens.spring.soft.stiffness)
      .withInitialValues({
      opacity: 1,
      transform: [{ translateY: 20 }],
    }),
  itemEnter: (delay = 0, direction: MotionDirection = 'up') =>
    FadeIn.duration(motionTokens.duration.base)
      .delay(delay)
      .withInitialValues({ transform: initialTransform(direction) }),
  modalPop: (delay = 0) =>
    FadeIn.duration(motionTokens.duration.slow)
      .delay(delay)
      .withInitialValues({ opacity: 0, transform: [{ scale: 0.94 }, { translateY: 14 }] }),
};
