import type { ComponentProps } from 'react';
import type { Category, FaqItem, PlatformStat, Service, Testimonial } from '../../../common/CommonDto';
import type { EarningsCalculator, PostJobComposer, SearchBox } from '../../../component/marketplace';
import type { WithLoading } from '../layout.types';

/*
 * Contract between pages/hero (behaviour) and client/default/hero (markup) for the public landing page.
 * Static marketing copy and icons live in the layout; data, values and handlers come from the page.
 */

/** Anchor of the provider "Earn with Helpio" section, used for smooth scrolling */
export const EARN_SECTION_ID = 'earn';

export interface LandingSections {
  search: ComponentProps<typeof SearchBox>;
  quickCategories: { items: Category[]; onPick: (category: Category) => void };
  stats: PlatformStat[];

  /** Customer path: start a custom job */
  onPostJob: () => void;
  /** Provider path: scroll to the earn section */
  onExploreEarning: () => void;
  topMonthlyEarning: number;

  popular: { items: Service[]; onBook: (service: Service) => void; onSeeAll: () => void };
  categories: { items: Category[]; onSelect: (category: Category) => void; onMore: () => void };

  /** Benefits copy is supplied by the layout */
  earnings: Omit<ComponentProps<typeof EarningsCalculator>, 'benefits'>;
  onJoinProvider: () => void;

  testimonials: Testimonial[];
  faqs: FaqItem[];
  composer: ComponentProps<typeof PostJobComposer>;
}

export type LandingLayoutProps = WithLoading<LandingSections>;
