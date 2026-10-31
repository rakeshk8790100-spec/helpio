import type { ReactNode } from 'react';

/** Horizontal snap carousel that bleeds to the screen edge inside the 20px content padding. */
const HScroll = ({ children }: { children: ReactNode }) => (
  <div className="scrollbar-none -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1">
    {children}
  </div>
);

export default HScroll;
