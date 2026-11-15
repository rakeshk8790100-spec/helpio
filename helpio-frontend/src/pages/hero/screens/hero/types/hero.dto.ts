import type { ComponentProps } from 'react';
import type { Category, EarningRate, FaqItem, PlatformStat, Service, Testimonial, WithLoading } from '@/common/CommonDto';
import type { EarningsCalculator, PostJobComposer, SearchBox } from '@/components/common';

/** Public landing payload, shared by customers and providers. */
export interface LandingDto {
  stats: PlatformStat[];
  categories: Category[];
  popular: Service[];
  earningRates: EarningRate[];
  /** Headline "earn up to" figure for the provider path card, in ₹ per month */
  topMonthlyEarning: number;
  testimonials: Testimonial[];
  faqs: FaqItem[];
}

/*
 * The landing layout's props. Static marketing copy and icons live in the layout; data, values and handlers come
 * from the page.
 */


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
