import { useState, useEffect } from 'react';

// Easing function for smooth decelaration (easeOutExpo)
const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

export function useCountUp(endValue: number | string, durationMs: number = 400) {
  const target = Number(endValue);
  const [count, setCount] = useState<number | string>(() => (isNaN(target) ? endValue : 0));

  useEffect(() => {
    // If endValue is string or not a number, just return it (fallback)
    if (isNaN(target)) {
      setCount(endValue);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      const easedProgress = easeOutExpo(progress);

      setCount(Math.round(easedProgress * target));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [target, durationMs, endValue]);

  return isNaN(Number(endValue)) ? endValue : count;
}

