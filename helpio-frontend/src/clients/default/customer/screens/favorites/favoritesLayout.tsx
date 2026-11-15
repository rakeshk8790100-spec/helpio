import { Alert, Button, Modal, Select, Skeleton } from 'antd';
import { Clock, Heart, Lock, Plus, Search, X } from 'lucide-react';
import { AlertBanner, Chip, ProgressBar } from '@/components/ui';
import type { FavoritesModalLayoutProps } from '@/pages/customer/screens/favorites/types/favorites.dto';

const ADD_VALUE = '__add__';

const sectionTitle = 'mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500';

/**
 * "Choose your favourite services": tap a suggestion, search the catalog, or type one it lacks.
 * Your home then shows them, with pros who offer them.
 */
const FavoritesModalLayout = (p: FavoritesModalLayoutProps) => (
  <Modal
    open
    centered
    width={440}
    onCancel={p.onClose}
    title={null}
    footer={null}
    maskClosable={false}
    styles={{ body: { maxHeight: '80dvh', display: 'flex', flexDirection: 'column' } }}
  >
    <div className="flex items-start gap-3 pr-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
        <Heart size={20} />
      </span>
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {p.mode === 'add' ? 'Choose your favourite services' : 'Your favourite services'}
        </h2>
        <div className="mt-0.5 text-xs text-slate-500">
          {p.mode === 'add'
            ? "Pick up to 8 services you use often. They'll show on your home screen, with pros who offer them."
            : 'Pick up to 8. Your home screen shows them, with pros who offer them.'}
        </div>
      </div>
    </div>

    <div className="mt-4" aria-live="polite">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-800">
          {p.progress.picked} of {p.progress.total} picked
        </span>
        <span className={p.full ? 'font-semibold text-emerald-600' : 'text-slate-500'}>{p.progress.hint}</span>
      </div>
      <ProgressBar value={(p.progress.picked / p.progress.total) * 100} label="Favourite services picked" />
    </div>

    <div className="mt-4">
      {p.status === 'loading' && <Skeleton.Input active block size="large" />}
      {p.status === 'error' && <AlertBanner message={p.message} onRetry={p.onRetry} />}
      {p.status === 'ready' && (
        <>
          <Select<string | null>
            size="large"
            className="w-full"
            value={null}
            disabled={p.full}
            placeholder={p.full ? 'All 8 picked. Remove one to change it.' : 'Search, e.g. tap repair, AC service'}
            aria-label="Search services"
            suffixIcon={<Search size={16} />}
            showSearch={{ searchValue: p.search, onSearch: p.onSearch, filterOption: false, autoClearSearchValue: true }}
            listHeight={260}
            notFoundContent={
              <div className="px-1 py-2 text-xs text-slate-500">
                {p.search.trim().length < 2 ? 'Keep typing…' : 'Already picked'}
              </div>
            }
            options={[
              ...p.options,
              ...(p.addOption
                ? [
                    {
                      label: 'Not in the list?',
                      options: [
                        {
                          value: ADD_VALUE,
                          label: (
                            <span className="flex items-center gap-2 font-medium text-indigo-600">
                              <Plus size={14} />
                              Add &ldquo;{p.addOption}&rdquo;
                            </span>
                          ),
                        },
                      ],
                    },
                  ]
                : []),
            ]}
            onSelect={(value) => {
              if (value === ADD_VALUE && p.addOption) p.onAddCustom(p.addOption);
              else if (value) p.onPick(value);
            }}
          />
          <p className="mt-1.5 text-[11px] text-slate-500">
            Can&rsquo;t find it? Type its name and tap <span className="font-semibold text-indigo-600">Add</span>.
          </p>
        </>
      )}
    </div>

    <div className="-mx-6 mt-3 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-1">
      {p.chosen.length > 0 && (
        <section>
          <h3 className={sectionTitle}>Your picks</h3>
          <ul className="flex flex-wrap gap-2">
            {p.chosen.map((c) => (
              <li
                key={c.key}
                className={`flex items-center gap-1.5 rounded-full border py-1.5 pl-3 text-xs font-medium ${
                  c.locked
                    ? 'border-slate-200 bg-slate-50 pr-3 text-slate-500'
                    : 'border-indigo-600 bg-indigo-50 pr-1.5 text-indigo-700'
                }`}
              >
                {c.locked && <Lock size={11} />}
                {c.label}
                {c.requested && (
                  <span
                    className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                    title="Not in our list yet. Our team will add it."
                  >
                    <Clock size={9} />
                    Requested
                  </span>
                )}
                {!c.locked && (
                  <button
                    type="button"
                    onClick={() => p.onRemove(c.key)}
                    aria-label={`Remove ${c.label}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-indigo-500 transition hover:bg-indigo-100 hover:text-indigo-700"
                  >
                    <X size={12} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.status === 'ready' && p.suggestions.length > 0 && (
        <section>
          <h3 className={sectionTitle}>
            Suggested for you
            {p.full && <span className="ml-1 font-normal normal-case tracking-normal">· remove one to swap</span>}
          </h3>
          <div role="group" aria-label="Suggested services" className="flex flex-wrap gap-2">
            {p.suggestions.map((s) => (
              <Chip key={s.value} icon={<Plus size={12} />} disabled={p.full} onClick={() => p.onPick(s.value)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </section>
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
