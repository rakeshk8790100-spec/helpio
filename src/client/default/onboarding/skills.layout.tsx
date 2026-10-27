import { Alert, Button } from 'antd';
import { SkillPicker } from '../../../component/marketplace';
import { PageSkeleton, StepProgress } from '../../../component/ui';
import { MAX_SKILLS, MIN_SKILLS, PROVIDER_SIGNUP_STEPS } from './onboarding.layout.types';
import type { SkillsLayoutProps } from './onboarding.layout.types';

/** Provider sign-up step 2: search or browse services, pick at least MIN_SKILLS, and rate each. */
const SkillsLayout = (p: SkillsLayoutProps) => {
  if (p.loading) return <PageSkeleton />;

  const missing = MIN_SKILLS - p.selectedCount;
  return (
    <div className="flex flex-col gap-6">
      {!p.editing && <StepProgress steps={PROVIDER_SIGNUP_STEPS} current={2} />}
      <div>
        <div className="text-2xl font-bold text-slate-900">{p.editing ? 'Your skills' : 'What work do you do?'}</div>
        <div className="mt-1 text-sm text-slate-600">
          Pick at least {MIN_SKILLS} services you do well, and your level in each. You'll see jobs that match them.
        </div>
      </div>

      {p.editing && missing > 0 && p.selectedCount > 0 && (
        <Alert
          type="info"
          showIcon
          title={`Helpio now asks for at least ${MIN_SKILLS} services. Add ${missing} more to save changes.`}
        />
      )}

      {p.loadError ? (
        <Alert
          type="error"
          showIcon
          title="We couldn't load the skills list."
          action={<Button size="small" onClick={p.onRetry}>Retry</Button>}
        />
      ) : (
        <SkillPicker {...p.picker} max={MAX_SKILLS} />
      )}

      {p.error && <Alert type="error" showIcon title={p.error} />}

      <div className="sticky -bottom-5 -mx-5 mt-auto border-t border-slate-100 bg-white px-5 pt-3 pb-5">
        {missing > 0 && (
          <div className="mx-auto mb-2 h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-slate-100" aria-hidden>
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${(p.selectedCount / MIN_SKILLS) * 100}%` }}
            />
          </div>
        )}
        <div role="status" className="mb-2 text-center text-xs text-slate-500">
          {missing > 0
            ? `${p.selectedCount} of ${MIN_SKILLS} picked · ${missing} more to go`
            : `${p.selectedCount} selected · up to ${MAX_SKILLS}`}
        </div>
        <Button type="primary" size="large" block disabled={missing > 0 || p.loadError} loading={p.saving} onClick={p.onContinue}>
          {p.editing ? 'Save skills' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};

export default SkillsLayout;
