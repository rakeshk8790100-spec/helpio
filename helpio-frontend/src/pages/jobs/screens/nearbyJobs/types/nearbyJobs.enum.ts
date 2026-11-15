
export const JobsView = { LIST: 'list', MAP: 'map' } as const;
export type JobsView = (typeof JobsView)[keyof typeof JobsView];

export const ProJobsTab = { NEW: 'new', ACTIVE: 'active', COMPLETED: 'completed' } as const;
export type ProJobsTab = (typeof ProJobsTab)[keyof typeof ProJobsTab];
