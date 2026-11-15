import { HeartHandshake } from 'lucide-react';

const SIZES = {
  sm: { mark: 'h-8 w-8 rounded-lg', icon: 18, word: 'text-xl' },
  md: { mark: 'h-11 w-11 rounded-xl', icon: 24, word: 'text-2xl' },
};

interface Props {
  size?: keyof typeof SIZES;
}

/** Helpio brand: indigo mark plus the "helpio" wordmark (the wordmark is the accessible name). */
const HelpioLogo = ({ size = 'sm' }: Props) => (
  <span className="inline-flex items-center gap-2">
    <span aria-hidden className={`flex shrink-0 items-center justify-center bg-indigo-600 text-white ${SIZES[size].mark}`}>
      <HeartHandshake size={SIZES[size].icon} strokeWidth={2.2} />
    </span>
    <span className={`font-bold tracking-tight text-slate-900 ${SIZES[size].word}`}>helpio</span>
  </span>
);

export default HelpioLogo;
