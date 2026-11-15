import { Proficiency } from '@/common/CommonEnum';

/** How a provider's level reads to customers (quotes, search, profiles). */
export const PROFICIENCY_LABEL: Record<Proficiency, string> = {
  [Proficiency.BEGINNER]: 'Beginner',
  [Proficiency.INTERMEDIATE]: 'Skilled',
  [Proficiency.EXPERT]: 'Expert',
};
