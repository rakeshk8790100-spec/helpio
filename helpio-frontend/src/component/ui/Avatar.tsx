import { initials } from '../../lib/utils';

const SIZES = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base',
  xl: 'h-20 w-20 text-xl',
};

interface Props {
  name: string;
  /** Profile photo; initials on the brand gradient without one */
  src?: string | null;
  size?: keyof typeof SIZES;
}

/** Round avatar: the person's photo, or their initials on the brand gradient. */
const Avatar = ({ name, src, size = 'md' }: Props) =>
  src ? (
    <img src={src} alt="" aria-hidden className={`shrink-0 rounded-full bg-slate-100 object-cover ${SIZES[size]}`} />
  ) : (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-500 font-bold text-white ${SIZES[size]}`}
    >
      {initials(name)}
    </span>
  );

export default Avatar;
