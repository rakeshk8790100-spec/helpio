
/** Earnings tabs, kept in `?tab=` */
export const EarningsTab = { ALL: 'all', TO_RECEIVE: 'to-receive', RECEIVED: 'received' } as const;
export type EarningsTab = (typeof EarningsTab)[keyof typeof EarningsTab];
