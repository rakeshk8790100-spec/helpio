import { Alert, Button, Form, Input, Segmented, Select } from 'antd';
import { CircleCheck, LocateFixed, MapPin } from 'lucide-react';
import { ChipMultiSelect, PageSkeleton, StepProgress } from '../../../component/ui';
import { WEEKDAY_SHORT, formatDays, formatTime } from '../../../lib/utils';
import { PROVIDER_SIGNUP_STEPS } from './onboarding.layout.types';
import type { ServiceAreaLayoutProps, ServiceSetupFormValues } from './onboarding.layout.types';

const DAY_OPTIONS = WEEKDAY_SHORT.map((label, day) => ({ value: day, label }));
const RADIUS_OPTIONS = [2, 5, 10, 15, 25].map((km) => ({ value: km, label: `${km} km` }));
/** Every half hour, 00:00 to 23:30 */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const value = `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
  return { value, label: formatTime(value) };
});

const Summary = ({ values }: { values: Partial<ServiceSetupFormValues> }) => {
  if (!values.days?.length || !values.start || !values.end || values.end <= values.start || !values.radiusKm) return null;
  return (
    <div role="status" className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
      You'll get jobs within <span className="font-semibold">{values.radiusKm} km</span> of{' '}
      <span className="font-semibold">{values.areaName?.trim() || 'your area'}</span>,{' '}
      {formatDays(values.days)}, {formatTime(values.start)}–{formatTime(values.end)}.
    </div>
  );
};

/** Provider sign-up step 3: availability, service location and radius. */
const ServiceAreaLayout = (p: ServiceAreaLayoutProps) => {
  if (p.loading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <StepProgress steps={PROVIDER_SIGNUP_STEPS} current={3} />
      <div>
        <div className="text-2xl font-bold text-slate-900">When and where do you work?</div>
        <div className="mt-1 text-sm text-slate-600">You can change this any time.</div>
      </div>

      {p.loadError && (
        <Alert
          type="error"
          showIcon
          title="We couldn't load your saved details."
          action={<Button size="small" onClick={p.onRetry}>Retry</Button>}
        />
      )}

      <Form
        form={p.form}
        layout="vertical"
        requiredMark={false}
        initialValues={p.initialValues}
        onFinish={p.onSubmit}
        className="flex flex-col gap-2"
      >
        <section className="rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="mb-3 text-base font-semibold text-slate-900">Working days and hours</div>
          <Form.Item name="days" rules={[{ required: true, type: 'array', min: 1, message: 'Pick at least one day' }]}>
            <ChipMultiSelect options={DAY_OPTIONS} ariaLabel="Working days" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="start" label="From" className="!mb-0">
              <Select size="large" options={TIME_OPTIONS} virtual={false} aria-label="Start time" />
            </Form.Item>
            <Form.Item
              name="end"
              label="To"
              dependencies={['start']}
              className="!mb-0"
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, end: string) =>
                    end > getFieldValue('start') ? Promise.resolve() : Promise.reject(new Error('Must be after the start time')),
                }),
              ]}
            >
              <Select size="large" options={TIME_OPTIONS} virtual={false} aria-label="End time" />
            </Form.Item>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="text-base font-semibold text-slate-900">Where you're based</div>
          <div className="mt-1 mb-3 text-xs text-slate-500">
            Customers only ever see your approximate area, never your exact location.
          </div>

          {p.location.coordinates ? (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <span className="flex items-center gap-2">
                <CircleCheck size={16} />
                Current location added
              </span>
              <button type="button" onClick={p.location.onClear} className="font-medium text-slate-600">
                Remove
              </button>
            </div>
          ) : (
            <Button
              size="large"
              block
              icon={<LocateFixed size={16} />}
              loading={p.location.locating}
              onClick={p.location.onLocate}
              className="!mb-3"
            >
              Use my current location
            </Button>
          )}
          {p.location.error && <Alert type="warning" showIcon title={p.location.error} className="!mb-3" />}

          <div className="grid grid-cols-[2fr_3fr] gap-3">
            <Form.Item
              name="pincode"
              label="Pincode"
              normalize={(value: string) => value.replace(/\D/g, '')}
              rules={[
                { required: true, message: 'Enter your pincode' },
                { pattern: /^[1-9]\d{5}$/, message: 'Enter a 6-digit pincode' },
              ]}
            >
              <Input size="large" inputMode="numeric" maxLength={6} autoComplete="postal-code" placeholder="560034" />
            </Form.Item>
            <Form.Item
              name="areaName"
              label="Area / locality"
              rules={[
                { required: true, whitespace: true, message: 'Enter your area' },
                { min: 2, max: 80, message: 'Use 2 to 80 characters' },
              ]}
            >
              <Input size="large" prefix={<MapPin size={14} className="text-slate-400" />} maxLength={80} placeholder="Koramangala" />
            </Form.Item>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="mb-3 text-base font-semibold text-slate-900">How far will you travel for a job?</div>
          <Form.Item name="radiusKm" className="!mb-0">
            <Segmented block options={RADIUS_OPTIONS} aria-label="Service radius" />
          </Form.Item>
        </section>

        <Summary values={p.summary} />

        {p.error && <Alert type="error" showIcon title={p.error} />}

        <div className="mt-2 grid grid-cols-[1fr_2fr] gap-3">
          <Button size="large" onClick={p.onBack}>
            Back
          </Button>
          <Button type="primary" htmlType="submit" size="large" loading={p.saving}>
            Finish sign-up
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default ServiceAreaLayout;
