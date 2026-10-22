export const formatINR = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`;

export const formatDuration = (mins: number) =>
  mins < 60 ? `${mins} min` : `${+(mins / 60).toFixed(1)} hr`;

export const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * Placeholder for the AI job-description helper: expands a short note into a structured brief.
 * Replace with the real AI endpoint once available.
 */
export const draftJobDescription = (text: string) =>
  `I need help with: ${text.trim()}.\n\n` +
  `• What's wrong: \n• Since when: \n• Preferred date/time: \n• Access notes (parking, floor, pets): \n\n` +
  `Please share photos/estimate before starting.`;
