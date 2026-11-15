
export const JobsTab = {
  DRAFTS: 'drafts',
  OPEN: 'open',
  ACTIVE: 'active',
  PAST: 'past',
} as const;
export type JobsTab = (typeof JobsTab)[keyof typeof JobsTab];
