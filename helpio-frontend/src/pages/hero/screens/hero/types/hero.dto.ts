import type {
  Category,
  EarningRate,
  FaqItem,
  PlatformStat,
  Service,
  Testimonial,
} from '../../../common/CommonDto';

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
