import { Alert, Button, Form, Input, InputNumber, Popconfirm, Switch } from 'antd';
import { ArrowRight, MapPin, Send, Siren, Sparkles } from 'lucide-react';
import { CurrentLocationButton, PhotoPicker } from '../../../component/marketplace';
import { Chip, ChipSelect, PageSkeleton } from '../../../component/ui';
import type { PostJobLayoutProps } from './jobs.layout.types';

const DURATIONS = [
  { value: 60, label: '1 hr' },
  { value: 120, label: '2 hr' },
  { value: 240, label: 'Half day' },
  { value: 480, label: 'Full day' },
];

/** Tap to start from a common job */
const EXAMPLES = ['Kitchen tap leaking', 'AC not cooling', 'Fan not working', 'Deep clean my 2BHK', 'Fix a door lock'];

const TITLES = { new: 'Check and post', draft: 'Finish your job', edit: 'Edit job' };

const Card = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-100 p-4 shadow-sm">
    <div className="text-base font-semibold text-slate-900">{title}</div>
    {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    <div className="mt-3">{children}</div>
  </section>
);

const InviteeNote = ({ name }: { name: string }) => (
  <div role="status" className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm text-indigo-900">
    <Send size={16} className="shrink-0 text-indigo-600" />
    Once posted, {name} gets this job first, and pros nearby can quote too.
  </div>
);

/** /jobs/new: describe the job in a few words, then check what was filled in (what, where, when) and post. */
const PostJobLayout = (p: PostJobLayoutProps) => {
  if (p.loading) return <PageSkeleton />;

  return (
    <>
      {p.step === 'describe' && (
        <div className="flex flex-col gap-5">
          <div>
            <div className="text-xl font-bold text-slate-900">What do you need help with?</div>
            <div className="mt-1 text-sm text-slate-600">
              Describe it in your own words. We fill in the job for you to check, then pros nearby send quotes.
            </div>
          </div>
          {p.invitee && <InviteeNote name={p.invitee} />}
          <Input.TextArea
            autoFocus
            rows={4}
            maxLength={1000}
            value={p.describe.value}
            onChange={(e) => p.describe.onChange(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                p.describe.onContinue();
              }
            }}
            placeholder="e.g. Kitchen tap leaking since yesterday, water on the floor"
            aria-label="Describe your job"
            disabled={p.describe.loading}
          />
          <div role="group" aria-label="Examples" className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <Chip key={example} onClick={() => p.describe.onChange(example)} disabled={p.describe.loading}>
                {example}
              </Chip>
            ))}
          </div>
          <Button type="primary" size="large" block loading={p.describe.loading} onClick={p.describe.onContinue}>
            {p.describe.loading ? 'Writing your job…' : 'Continue'}
            {!p.describe.loading && <ArrowRight size={16} />}
          </Button>
          <button
            type="button"
            onClick={p.describe.onSkip}
            disabled={p.describe.loading}
            className="self-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 active:scale-95 disabled:opacity-50"
          >
            Fill in the form myself
          </button>
        </div>
      )}

      <div className={p.step === 'describe' ? 'hidden' : 'flex flex-col gap-5'}>
        <div>
          <div className="text-xl font-bold text-slate-900">{TITLES[p.mode]}</div>
          <div className="mt-1 text-sm text-slate-600">
            {p.mode === 'edit'
              ? 'Pros who already quoted will see the job was changed, so they can update their quote.'
              : 'Pros nearby send quotes. You choose, and pay only after you approve the work.'}
          </div>
        </div>

        {p.suggestion && (
          <div role="status" className="flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-sm text-violet-900">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-violet-600" />
            <span className="min-w-0 flex-1">
              {p.suggestion.source === 'ai'
                ? 'We drafted this from what you wrote. Check it, then post.'
                : 'We filled in what we could from what you wrote. Check it, then post.'}
            </span>
            <button type="button" onClick={p.suggestion.onStartOver} className="shrink-0 text-xs font-semibold text-violet-700 active:scale-95">
              Start over
            </button>
          </div>
        )}

        {p.invitee && <InviteeNote name={p.invitee} />}

        <Form
          form={p.form}
          layout="vertical"
          requiredMark="optional"
          initialValues={p.initialValues}
          onValuesChange={p.onValuesChange}
          className="flex flex-col gap-4"
        >
          <Card title="What needs doing?">
            <Form.Item
              name="description"
              label="Details"
              rules={[{ required: true, whitespace: true, message: 'Describe the job so pros can quote' }]}
            >
              <Input.TextArea rows={4} maxLength={2000} showCount placeholder="What's wrong, since when, anything the pro should know." />
            </Form.Item>
            <Form.Item name="categoryId" label="Category" rules={[{ required: true, message: 'Pick a category' }]}>
              <ChipSelect options={p.categories} ariaLabel="Category" />
            </Form.Item>
            <Form.Item name="title" label="Title" rules={[{ min: 3, max: 120, message: 'Use 3 to 120 characters' }]} className="!mb-0">
              <Input size="large" maxLength={120} placeholder="We'll make one from the details" />
            </Form.Item>
          </Card>

          <Card title="Where?" hint="Pros only see your area and a rough distance until you hire one.">
            {p.addresses && (
              <div role="group" aria-label="Saved addresses" className="mb-3 flex flex-wrap gap-2">
                {p.addresses.items.map((a) => (
                  <Chip key={a.id} active={p.addresses?.selectedId === a.id} onClick={() => p.addresses?.onSelect(a.id)}>
                    {a.label}
                  </Chip>
                ))}
                <Chip active={p.addresses.selectedId === null} onClick={() => p.addresses?.onSelect(null)}>
                  Somewhere else
                </Chip>
              </div>
            )}
            {!p.addresses?.selectedId && <CurrentLocationButton {...p.location} />}
            <div className="grid grid-cols-[2fr_3fr] gap-3">
              <Form.Item
                name="pincode"
                label="Pincode"
                normalize={(value: string) => value.replace(/\D/g, '')}
                rules={[
                  { required: true, message: 'Enter the pincode' },
                  { pattern: /^[1-9]\d{5}$/, message: 'Enter a 6-digit pincode' },
                ]}
                className="!mb-0"
              >
                <Input size="large" inputMode="numeric" maxLength={6} autoComplete="postal-code" placeholder="560034" />
              </Form.Item>
              <Form.Item
                name="areaName"
                label="Area / locality"
                rules={[
                  { required: true, whitespace: true, message: 'Enter the area or locality' },
                  { min: 2, max: 80, message: 'Use 2 to 80 characters' },
                ]}
                className="!mb-0"
              >
                <Input size="large" prefix={<MapPin size={14} className="text-slate-400" />} maxLength={80} placeholder="Koramangala" />
              </Form.Item>
            </div>
            {p.askAddressLine ? (
              <Form.Item name="addressLine" label="Flat, building, street" className="!mb-0 !mt-4" extra="Shared only with the pro you hire.">
                <Input size="large" maxLength={300} autoComplete="street-address" placeholder="Flat 4B, Sea View, 2nd Cross Road" />
              </Form.Item>
            ) : (
              p.savedAddressLine && (
                <div className="mt-3 text-xs text-slate-500">
                  {p.savedAddressLine} · shared only with the pro you hire.
                </div>
              )
            )}
          </Card>

          <Card title="When?">
            <Form.Item name="whenDay" label="Day" extra="Leave it empty if you're flexible.">
              <ChipSelect options={p.when.dayOptions} ariaLabel="Day" allowClear />
            </Form.Item>
            {p.when.showDate && (
              <Form.Item name="whenDate" label="Date" rules={[{ required: true, message: 'Pick a date' }]}>
                <Input size="large" type="date" min={p.when.minDate} />
              </Form.Item>
            )}
            {p.when.showSlots && (
              <Form.Item name="whenSlot" label="Time of day">
                <ChipSelect options={p.when.slotOptions} ariaLabel="Time of day" />
              </Form.Item>
            )}
            <Form.Item name="durationMins" label="Roughly how long?">
              <ChipSelect options={DURATIONS} ariaLabel="Duration" allowClear />
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

          <Card title="Budget" hint="Pros can quote above or below it.">
            <Form.Item
              name="budget"
              label="Your budget"
              rules={[{ type: 'number', min: 100, max: 1_000_000, message: 'Between ₹100 and ₹10,00,000' }]}
              className="!mb-0"
            >
              <InputNumber size="large" step={100} prefix="₹" placeholder="800" className="!w-full" />
            </Form.Item>
          </Card>

          <Card title="Photos" hint="Up to 6 photos or short videos (10 MB each). They help pros quote accurately.">
            <PhotoPicker {...p.photos} />
          </Card>
        </Form>

        {p.error && <Alert type="error" showIcon title={p.error} />}

        <div className="grid grid-cols-[1fr_2fr] gap-3">
          {p.mode === 'edit' ? (
            <Button size="large" onClick={p.onCancel} disabled={p.saving !== null}>
              Cancel
            </Button>
          ) : (
            <Button size="large" onClick={p.onSaveDraft} loading={p.saving === 'draft'} disabled={p.saving !== null && p.saving !== 'draft'}>
              Save draft
            </Button>
          )}
          <Button type="primary" size="large" onClick={p.onPost} loading={p.saving === 'post'} disabled={p.saving !== null && p.saving !== 'post'}>
            {p.mode === 'edit' ? 'Save changes' : 'Post job'}
          </Button>
        </div>

        {p.onDeleteDraft && (
          <Popconfirm
            title="Delete this draft?"
            description="Its details and photos are removed."
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Keep"
            onConfirm={p.onDeleteDraft}
          >
            <Button type="text" danger loading={p.saving === 'delete'} disabled={p.saving !== null && p.saving !== 'delete'} className="self-center">
              Delete draft
            </Button>
          </Popconfirm>
        )}
      </div>
    </>
  );
};

export default PostJobLayout;
