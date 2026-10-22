import { initials } from '../../lib/utils';

const SIZES = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base',
};

interface Props {
  name: string;
  size?: keyof typeof SIZES;
}

/** Initials avatar on the brand gradient. */
const Avatar = ({ name, size = 'md' }: Props) => (
  <span
    aria-hidden
    className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-500 font-bold text-white ${SIZES[size]}`}
  >
    {initials(name)}
  </span>
);

export default Avatar;
