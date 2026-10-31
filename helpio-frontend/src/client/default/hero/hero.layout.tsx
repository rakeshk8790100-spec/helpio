import { Button } from 'antd';
import {
  BadgeCheck,
  BriefcaseBusiness,
  CircleCheck,
  FilePlus,
  Handshake,
  ListChecks,
  Scale,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Wrench,
} from 'lucide-react';
import {
  AudienceCard,
  CategoryGrid,
  EarningsCalculator,
  PostJobComposer,
  SearchBox,
  ServiceCard,
  TestimonialCard,
  TrustStrip,
} from '../../../component/marketplace';
import { Chip, FaqList, HScroll, PageSkeleton, SectionHeader, StatTile, StepList } from '../../../component/ui';
import type { StepListItem } from '../../../component/ui';
import { formatINR } from '../../../lib/utils';
import { EARN_SECTION_ID } from './hero.layout.types';
import type { LandingLayoutProps } from './hero.layout.types';

const CUSTOMER_STEPS: StepListItem[] = [
  { Icon: FilePlus, title: 'Book or post a job', text: 'Pick a service, or describe anything custom in a few words.' },
  { Icon: Scale, title: 'Compare quotes', text: 'See price, rating, distance and warranty side by side.' },
  { Icon: ShieldCheck, title: 'Pay safely', text: 'Your money waits in escrow; work starts with your PIN.' },
  { Icon: CircleCheck, title: 'Approve & release', text: 'Review proof at each stage and pay only for approved work.' },
];

const PROVIDER_STEPS: StepListItem[] = [
  { Icon: UserPlus, title: 'Sign up', text: 'Create your account with your email, mobile number and a password.' },
  { Icon: BadgeCheck, title: 'Get verified', text: 'Quick KYC and a selfie check build customer trust.' },
  { Icon: ListChecks, title: 'Add your skills & area', text: 'Choose 3+ skills, your service radius and hours.' },
  { Icon: BriefcaseBusiness, title: 'Start earning', text: 'Quote on nearby jobs and get paid weekly.' },
];

const PROVIDER_BENEFITS = ['Choose your own jobs', 'Work near home', 'Payment secured in escrow', 'Weekly payouts'];

/** Public landing page, one scroll for both audiences. Search first (customers), earn section mid-page (providers). */
const HeroLayout = (p: LandingLayoutProps) => {
  if (p.loading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      {/* ① Hero */}
      <div className="-mx-5 -mt-5 bg-linear-to-b from-indigo-50 to-white px-5 pt-6">
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-indigo-700 shadow-sm">
          <Sparkles size={12} />
          Verified pros near you
        </span>
        <div className="mt-3 text-[28px] font-extrabold leading-[1.15] tracking-tight text-slate-900">
          Get any job done, <span className="text-gradient">fast.</span>
        </div>
        <div className="mt-2 text-sm text-slate-600">
          Repairs, cleaning, moving and more. Fair quotes in minutes, and you pay only for approved work.
        </div>
      </div>
      <SearchBox {...p.search} />
      <div className="-mt-3 flex flex-col gap-4">
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5">
          {p.quickCategories.items.map((c) => (
            <Chip key={c.id} onClick={() => p.quickCategories.onPick(c)}>
              {c.name}
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {p.stats.map((s) => (
            <StatTile key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </div>

      {/* ② Two paths */}
      <div className="grid grid-cols-2 gap-3">
        <AudienceCard
          Icon={Wrench}
          eyebrow="I need help"
          title="Get it done today"
          highlight="Quotes in minutes"
          ctaLabel="Post a job"
          onClick={p.onPostJob}
        />
        <AudienceCard
          Icon={Handshake}
          tone="dark"
          eyebrow="I want to earn"
          title="Work on your terms"
          highlight={`Earn up to ${formatINR(p.topMonthlyEarning)}/mo`}
          ctaLabel="See earnings"
          onClick={p.onExploreEarning}
        />
      </div>

      {/* ③ Popular services */}
      <section>
        <SectionHeader title="Popular services" actionLabel="See all" onAction={p.popular.onSeeAll} />
        <HScroll>
          {p.popular.items.map((s) => (
            <ServiceCard key={s.id} service={s} onBook={() => p.popular.onBook(s)} />
          ))}
        </HScroll>
      </section>

      {/* ④ Categories */}
      <section>
        <SectionHeader title="Browse categories" />
        <CategoryGrid categories={p.categories.items} onSelect={p.categories.onSelect} onMore={p.categories.onMore} />
      </section>

      {/* ⑤ Customer journey */}
      <section>
        <SectionHeader title="How Helpio works" />
        <StepList steps={CUSTOMER_STEPS} />
      </section>

      {/* ⑥ Trust, for both sides */}
      <TrustStrip title="Safe for customers and pros" />

      {/* ⑦ Provider section */}
      <section id={EARN_SECTION_ID} className="-mx-5 scroll-mt-4 bg-slate-900 px-5 py-6 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">For professionals</div>
        <div className="mt-1 text-2xl font-bold leading-tight">
          Turn your skills into steady income
        </div>
        <div className="mt-1 text-sm text-white/70">
          Get nearby jobs, set your own hours and never chase a payment again.
        </div>

        <div className="mt-4">
          <EarningsCalculator {...p.earnings} benefits={PROVIDER_BENEFITS} />
        </div>

        <div className="mt-6 text-sm font-semibold">Join in 4 simple steps</div>
        <div className="mt-3">
          <StepList steps={PROVIDER_STEPS} tone="dark" />
        </div>

        <button
          type="button"
          onClick={p.onJoinProvider}
          className="mt-5 h-12 w-full rounded-xl bg-amber-400 text-sm font-semibold text-slate-900 active:scale-[.98]"
        >
          Join Helpio as a provider
        </button>
      </section>

      {/* ⑧ Testimonials */}
      <section>
        <SectionHeader title="Loved by customers and pros" />
        <HScroll>
          {p.testimonials.map((t) => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
        </HScroll>
      </section>

      {/* ⑨ FAQ */}
      <section>
        <SectionHeader title="Questions? We've got answers" />
        <FaqList items={p.faqs} />
      </section>

      {/* ⑩ Closing CTA */}
      <div className="flex flex-col gap-3">
        <PostJobComposer {...p.composer} />
        <Button type="link" onClick={p.onJoinProvider} className="!self-center">
          Want to earn with your skills? Join as a provider →
        </Button>
      </div>
    </div>
  );
};

export default HeroLayout;
