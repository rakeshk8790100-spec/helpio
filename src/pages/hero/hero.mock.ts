import { MOCK_CATEGORIES, MOCK_SERVICES } from '../../common/CommonMock';
import { UserRole } from '../../common/CommonEnum';
import type { LandingDto } from './types/hero.dto';

export const MOCK_LANDING: LandingDto = {
  stats: [
    { value: '12k+', label: 'Verified pros' },
    { value: '4.8★', label: 'Average rating' },
    { value: '100%', label: 'Payment protected' },
  ],
  categories: MOCK_CATEGORIES,
  popular: MOCK_SERVICES.slice(0, 6),
  earningRates: [
    { skillId: 'plumbing', skillName: 'Plumbing', hourlyAvg: 380 },
    { skillId: 'electrical', skillName: 'Electrical', hourlyAvg: 420 },
    { skillId: 'ac', skillName: 'AC Repair', hourlyAvg: 450 },
    { skillId: 'cleaning', skillName: 'Cleaning', hourlyAvg: 260 },
    { skillId: 'painting', skillName: 'Painting', hourlyAvg: 340 },
    { skillId: 'carpentry', skillName: 'Carpentry', hourlyAvg: 360 },
  ],
  topMonthlyEarning: 45000,
  testimonials: [
    {
      id: 't1',
      name: 'Asha R.',
      role: UserRole.CUSTOMER,
      text: 'Posted a leaking tap at 9 pm, had three quotes in 10 minutes and it was fixed by morning.',
      rating: 5,
      meta: 'Plumbing · Koramangala',
    },
    {
      id: 't2',
      name: 'Ravi K.',
      role: UserRole.PROVIDER,
      text: 'I pick jobs near my area and the money is already in escrow before I start. No more chasing payments.',
      rating: 5,
      meta: 'Plumber · 2 yrs on Helpio',
    },
    {
      id: 't3',
      name: 'Neha S.',
      role: UserRole.CUSTOMER,
      text: 'Seeing photos at every stage made me comfortable leaving the painter alone at home.',
      rating: 4.8,
      meta: 'Painting · HSR Layout',
    },
    {
      id: 't4',
      name: 'Imran A.',
      role: UserRole.PROVIDER,
      text: 'Weekends only, and I still added ₹18k a month. Weekly payouts are a big help.',
      rating: 4.9,
      meta: 'Electrician · part-time',
    },
  ],
  faqs: [
    {
      q: 'Is my payment safe?',
      a: 'Yes. You pay into Helpio escrow, and money is released to the provider only as you approve each stage of the work.',
    },
    {
      q: "What if I can't find the service I need?",
      a: 'Post a custom job with a short description, budget and time. Nearby verified providers send you quotes to compare.',
    },
    {
      q: 'How do providers get paid?',
      a: 'Customer payment is secured in escrow before the job starts. After approval it moves to your Helpio wallet, with weekly payouts to your bank.',
    },
    {
      q: 'What does it take to join as a provider?',
      a: 'Sign up, verify your phone and KYC, add at least 5 skills and your service area. Once approved, you can start quoting on nearby jobs.',
    },
    {
      q: 'Can I cancel or reschedule?',
      a: 'You can reschedule before the provider starts. Cancellation rules depend on the job stage and are shown before you confirm.',
    },
  ],
};
