import type { WithStatus } from '@/common/CommonDto';
import type { JobItem } from '@/common/JobDisplay';
import type { JobsTab } from './myJobs.enum';

/* The myJobs screen: wire shapes and layout props. */

export interface MyJobsLayoutProps {
  tab: JobsTab;
  tabs: { value: JobsTab; label: string }[];
  onTabChange: (tab: JobsTab) => void;
  jobs: WithStatus<{ items: JobItem[]; emptyText: string }>;
  onPostJob: () => void;
}
