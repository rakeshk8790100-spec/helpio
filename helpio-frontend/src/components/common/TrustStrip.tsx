import { Camera, KeyRound, MessageCircle, ShieldCheck } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';

// Copy is written for both sides: customers are protected, providers are guaranteed payment.
const ITEMS = [
  { Icon: ShieldCheck, title: 'Pay for approved work', text: 'You approve each stage with photos, then pay through Helpio. Pros are paid by Helpio.' },
  { Icon: KeyRound, title: 'Start PIN', text: 'Work begins only when the customer shares a one-time PIN on site.' },
  { Icon: Camera, title: 'Proof at every 25%', text: 'Photos and video for each stage keep everyone on the same page.' },
  { Icon: MessageCircle, title: 'Masked chat', text: 'Talk inside Helpio without sharing personal phone numbers.' },
];

/** Explains Helpio's trust model in four tiles. */
const TrustStrip = ({ title = 'How Helpio protects you' }: { title?: string }) => (
  <section>
    <SectionHeader title={title} />
    <div className="grid grid-cols-2 gap-3">
      {ITEMS.map(({ Icon, title: itemTitle, text }) => (
        <div key={itemTitle} className="rounded-2xl bg-indigo-50 p-3">
          <Icon size={20} className="text-indigo-600" />
          <div className="mt-2 text-sm font-semibold text-slate-900">{itemTitle}</div>
          <div className="mt-0.5 text-xs leading-snug text-slate-600">{text}</div>
        </div>
      ))}
    </div>
  </section>
);

export default TrustStrip;
