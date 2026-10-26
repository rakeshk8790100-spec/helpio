import { useEffect, useState } from 'react';

/** The current time, refreshed every minute, so countdowns and "overdue" stay current between polls */
export const useNow = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
};
