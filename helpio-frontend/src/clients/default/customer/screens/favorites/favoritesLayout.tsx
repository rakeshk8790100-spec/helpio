import { Alert, Button, Modal, Skeleton } from 'antd';
import { Check, Heart, Lock } from 'lucide-react';
import { AlertBanner, Chip } from '@/components/ui';
import type { FavoritesModalLayoutProps } from '@/pages/customer/screens/favorites/types/favorites.dto';

/** "Choose your favourite services": the catalog by category; your home then shows pros who offer them. */
const FavoritesModalLayout = (p: FavoritesModalLayoutProps) => (
  <Modal
    open
    centered
    width={440}
    onCancel={p.onClose}
    title={null}
    footer={null}
    maskClosable={false}
    styles={{ body: { maxHeight: '75dvh', display: 'flex', flexDirection: 'column' } }}
  >
    <div className="flex items-start gap-3 pr-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
        <Heart size={20} />
      </span>
      <div>
        <div className="text-lg font-bold text-slate-900">
          {p.mode === 'add' ? 'Choose your favourite services' : 'Your favourite services'}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {p.mode === 'add'
            ? "Pick a few you use often. We'll show pros who offer them on your home screen."
            : 'Pick up to 8. Your home screen shows pros who offer them.'}
        </div>
      </div>
    </div>

    <div className="mt-2 text-right text-xs font-semibold text-indigo-600" aria-live="polite">
      {p.counter}
    </div>

    <div className="-mx-6 mt-2 min-h-0 flex-1 overflow-y-auto px-6">
      {p.status === 'loading' && <Skeleton active paragraph={{ rows: 6 }} />}
      {p.status === 'error' && <AlertBanner message={p.message} onRetry={p.onRetry} />}
      {p.status === 'ready' && (
        <div className="flex flex-col gap-4 pb-2">
          {p.sections.map((section) => (
            <section key={section.id}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{section.name}</div>
              <div role="group" aria-label={section.name} className="flex flex-wrap gap-2">
                {section.choices.map((c) => (
                  <Chip
                    key={c.id}
                    active={c.selected}
                    disabled={c.locked || c.disabled}
                    icon={c.locked ? <Lock size={11} /> : c.selected ? <Check size={12} /> : undefined}
                    onClick={() => p.onToggle(c.id)}
                  >
                    {c.label}
                  </Chip>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>

    {p.error && <Alert type="error" showIcon title={p.error} className="!mt-3" />}

    <div className="mt-4 grid grid-cols-2 gap-2">
      <Button size="large" onClick={p.onClose} loading={p.skipping} disabled={p.saving}>
        {p.mode === 'add' ? 'Skip for now' : 'Cancel'}
      </Button>
      <Button type="primary" size="large" onClick={p.onSave} loading={p.saving} disabled={!p.canSave || p.skipping}>
        Save
      </Button>
    </div>
  </Modal>
);

export default FavoritesModalLayout;
