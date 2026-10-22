import { Button } from 'antd';
import { Plus, WandSparkles } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onImprove: () => void;
  onSubmit: () => void;
  improving?: boolean;
}

/** Dark CTA card: describe a job in a few words, optionally AI-improve it, then post. */
const PostJobComposer = ({ value, onChange, onImprove, onSubmit, improving = false }: Props) => (
  <section className="rounded-2xl bg-slate-900 p-4 text-white">
    <div className="text-base font-semibold">Can't find what you need?</div>
    <div className="mt-0.5 text-xs text-white/70">Describe it in a few words and get quotes from verified pros nearby.</div>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={value.includes('\n') ? 6 : 2}
      placeholder="e.g. balcony door won't lock"
      aria-label="Describe your job"
      className="mt-3 w-full resize-none rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:bg-white/15"
    />
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        disabled={!value.trim() || improving}
        onClick={onImprove}
        className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-medium disabled:opacity-40"
      >
        <WandSparkles size={14} />
        {improving ? 'Improving…' : 'Improve with AI'}
      </button>
      <Button type="primary" block icon={<Plus size={16} />} onClick={onSubmit}>
        Post a custom job
      </Button>
    </div>
  </section>
);

export default PostJobComposer;
