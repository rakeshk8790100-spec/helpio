import { Button } from 'antd';
import { ArrowRight } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  title?: string;
  hint?: string;
}

/** Dark CTA card: describe a job in your own words; the post form fills itself in from it. */
const PostJobComposer = ({
  value,
  onChange,
  onSubmit,
  title = "Can't find what you need?",
  hint = 'Describe it in your own words. We fill in the job for you, and verified pros nearby send quotes.',
}: Props) => (
  <section className="rounded-2xl bg-slate-900 p-4 text-white">
    <div className="text-base font-semibold">{title}</div>
    <div className="mt-0.5 text-xs text-white/70">{hint}</div>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSubmit();
        }
      }}
      rows={2}
      placeholder="e.g. kitchen tap leaking since yesterday"
      aria-label="Describe your job"
      className="mt-3 w-full resize-none rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:bg-white/15"
    />
    <Button type="primary" block size="large" className="!mt-2" onClick={onSubmit}>
      {value.trim() ? 'Continue' : 'Post a job'}
      <ArrowRight size={16} />
    </Button>
  </section>
);

export default PostJobComposer;
