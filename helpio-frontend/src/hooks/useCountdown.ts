import { useEffect, useState } from 'react';

/** A seconds countdown (e.g. "resend code in 42s"). Call `start(seconds)` from an event handler. */
export const useCountdown = () => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const running = secondsLeft > 0;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  return { secondsLeft, start: setSecondsLeft };
};
