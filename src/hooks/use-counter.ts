import { useEffect, useState } from 'react';

/**
 * Count-up animation hook. Ported verbatim from the Bolt reference
 * LandingPage.tsx (`useCounter`) — ~60fps step (16ms), finishes at `duration`,
 * snaps to the exact target on completion. Only fires while `active` is true,
 * so it should be wired to a useInView result.
 */
export function useCounter(target: number, active: boolean, duration = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (!Number.isFinite(target) || target <= 0) {
      setCount(Math.max(0, Math.floor(target)));
      return;
    }
    let current = 0;
    const stepsCount = Math.max(1, Math.round(duration / 16));
    const step = target / stepsCount;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);

  return count;
}
