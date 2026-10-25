import { Alert, Button, Form, Input, InputNumber, Switch } from 'antd';
import { MapPin, Siren, Sparkles } from 'lucide-react';
import { CurrentLocationButton, PhotoPicker } from '../../../component/marketplace';
import { ChipSelect, PageSkeleton } from '../../../component/ui';
import type { PostJobLayoutProps } from './jobs.layout.types';

const DURATIONS = [
  { value: 60, label: '1 hr' },
  { value: 120, label: '2 hr' },
  { value: 240, label: 'Half day' },
  { value: 480, label: 'Full day' },
];

const Card = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-100 p-4 shadow-sm">
    <div className="text-base font-semibold text-slate-900">{title}</div>
    {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    <div className="mt-3">{children}</div>
  </section>
);

/** /jobs/new: what, where, when, budget and photos, then save as draft or post. */
const PostJobLayout = (p: PostJobLayoutProps) => {
  if (p.loading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-xl font-bold text-slate-900">{p.editingDraft ? 'Finish your job' : 'Post a job'}</div>
        <div className="mt-1 text-sm text-slate-600">Pros nearby send quotes. You choose, and pay only for approved work.</div>
      </div>

      <Form form={p.form} layout="vertical" requiredMark={false} initialValues={p.initialValues} className="flex flex-col gap-4">
        <Card title="What do you need?">
          <Form.Item
            name="title"
            label="Title"
            rules={[
              { required: true, whitespace: true, message: 'Add a short title' },
              { min: 3, max: 120, message: 'Use 3 to 120 characters' },
            ]}
          >
            <Input size="large" maxLength={120} placeholder="e.g. Kitchen tap is leaking" />
          </Form.Item>
          <Form.Item name="description" label="Details" className="!mb-2">
            <Input.TextArea rows={5} maxLength={2000} showCount placeholder="What's wrong, since when, anything the pro should know." />
          </Form.Item>
          <button
            type="button"
            onClick={p.onImprove}
            className="mb-4 flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 active:scale-95"
          >
            <Sparkles size={14} />
            Improve with AI
          </button>
          <Form.Item name="categoryId" label="Category" className="!mb-0">
            <ChipSelect options={p.categories} ariaLabel="Category" />
          </Form.Item>
        </Card>

        <Card title="Where?" hint="Pros only see your area and a rough distance until you hire one.">
          <CurrentLocationButton {...p.location} />
          <div className="grid grid-cols-[2fr_3fr] gap-3">
            <Form.Item
              name="pincode"
              label="Pincode"
              normalize={(value: string) => value.replace(/\D/g, '')}
              rules={[{ pattern: /^[1-9]\d{5}$/, message: 'Enter a 6-digit pincode' }]}
              className="!mb-0"
            >
              <Input size="large" inputMode="numeric" maxLength={6} autoComplete="postal-code" placeholder="560034" />
            </Form.Item>
            <Form.Item name="areaName" label="Area / locality" rules={[{ max: 80 }]} className="!mb-0">
              <Input size="large" prefix={<MapPin size={14} className="text-slate-400" />} maxLength={80} placeholder="Koramangala" />
            </Form.Item>
          </div>
        </Card>

        <Card title="When?">
          <Form.Item name="when" label="Preferred date and time">
            <Input size="large" type="datetime-local" />
          </Form.Item>
          <Form.Item name="durationMins" label="Roughly how long?">
            <ChipSelect options={DURATIONS} ariaLabel="Duration" />
          </Form.Item>
          <div className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-red-700">
              <Siren size={16} />
              Emergency: needs help right away
            </span>
            <Form.Item name="isEmergency" valuePropName="checked" className="!mb-0">
              <Switch aria-label="Emergency job" />
            </Form.Item>
          </div>
        </Card>

        <Card title="Budget" hint="Optional. Pros can quote above or below it.">
          <Form.Item name="budget" className="!mb-0">
            <InputNumber size="large" min={100} max={1_000_000} step={100} prefix="₹" placeholder="800" className="!w-full" />
          </Form.Item>
        </Card>

        <Card title="Photos" hint="Up to 6 photos or short videos (10 MB each). They help pros quote accurately.">
          <PhotoPicker {...p.photos} />
        </Card>
      </Form>

      {p.error && <Alert type="error" showIcon title={p.error} />}

      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <Button size="large" onClick={p.onSaveDraft} loading={p.saving === 'draft'} disabled={p.saving === 'post'}>
          Save draft
        </Button>
        <Button type="primary" size="large" onClick={p.onPost} loading={p.saving === 'post'} disabled={p.saving === 'draft'}>
          Post job
        </Button>
      </div>
    </div>
  );
};

export default PostJobLayout;
