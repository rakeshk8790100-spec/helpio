import { InputNumber, Segmented } from 'antd';
import { Check, Search, X } from 'lucide-react';
import type { ProviderSkill, SkillCategory, SkillOption } from '@/common/CommonDto';
import { Proficiency } from '@/common/CommonEnum';
import Chip from '@/components/ui/Chip';
import HScroll from '@/components/ui/HScroll';
import { categoryIcon } from './categoryIcons';

const PROFICIENCY_OPTIONS = [
  { value: Proficiency.BEGINNER, label: 'Beginner' },
  { value: Proficiency.INTERMEDIATE, label: 'Intermediate' },
  { value: Proficiency.EXPERT, label: 'Expert' },
];

const PROFICIENCY_HINT: Record<Proficiency, string> = {
  [Proficiency.BEGINNER]: 'Learning, or under 1 year',
  [Proficiency.INTERMEDIATE]: 'Do it regularly on my own',
  [Proficiency.EXPERT]: 'Handle tricky jobs, train others',
};

interface Props {
  categories: SkillCategory[];
  activeCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  /** Search across every category; empty shows the active category */
  query: string;
  onQueryChange: (query: string) => void;
  selected: ProviderSkill[];
  onToggle: (skillId: string) => void;
  /** Pick every skill in the category (up to `max`), or clear them all when all are picked */
  onToggleCategory: (categoryId: string) => void;
  onProficiencyChange: (skillId: string, proficiency: Proficiency) => void;
  onYearsChange: (skillId: string, years: number | null) => void;
  max: number;
}

/** Search or browse skills by category, pick several, and rate each one. */
const SkillPicker = ({
  categories, activeCategoryId, onCategoryChange, query, onQueryChange, selected, onToggle, onToggleCategory,
  onProficiencyChange, onYearsChange, max,
}: Props) => {
  const active = categories.find((c) => c.id === activeCategoryId) ?? categories[0];
  // Nothing to pick from (the catalog is empty)
  if (!active) return null;
  const categoryOf = new Map(categories.flatMap((c) => c.skills.map((s) => [s.id, c] as const)));
  const selectedIds = new Set(selected.map((s) => s.skillId));
  const full = selected.length >= max;
  const term = query.trim().toLowerCase();
  const matches = term
    ? categories.flatMap((c) =>
        c.skills.filter((s) => s.name.toLowerCase().includes(term) || c.name.toLowerCase().includes(term)),
      )
    : [];
  const pickedIn = (category: SkillCategory) => category.skills.filter((s) => selectedIds.has(s.id)).length;
  const activePicked = pickedIn(active);
  const allPicked = activePicked === active.skills.length;

  const tile = (skill: SkillOption, showCategory: boolean) => {
    const isSelected = selectedIds.has(skill.id);
    return (
      <button
        key={skill.id}
        type="button"
        aria-pressed={isSelected}
        disabled={!isSelected && full}
        onClick={() => onToggle(skill.id)}
        className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition active:scale-[.98] disabled:opacity-50 ${
          isSelected ? 'border-indigo-400 bg-indigo-50 font-medium text-indigo-700 ring-2 ring-indigo-100' : 'border-slate-200 text-slate-700'
        }`}
      >
        <span className="flex flex-col">
          {skill.name}
          {showCategory && <span className="text-[11px] font-normal text-slate-500">{categoryOf.get(skill.id)?.name}</span>}
        </span>
        {isSelected && <Check size={16} className="shrink-0" />}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <label className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-indigo-400 focus-within:bg-white">
        <Search size={18} className="text-slate-400" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search services, e.g. geyser, CCTV"
          aria-label="Search services"
          className="h-full flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => onQueryChange('')} className="text-slate-400">
            <X size={16} />
          </button>
        )}
      </label>

      {term ? (
        matches.length > 0 ? (
          <div role="group" aria-label="Matching services" className="grid grid-cols-2 gap-2">
            {matches.map((skill) => tile(skill, true))}
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">No match. Try another word.</div>
        )
      ) : (
        <>
          <HScroll>
            {categories.map((category) => {
              const Icon = categoryIcon(category.icon);
              const count = pickedIn(category);
              return (
                <Chip
                  key={category.id}
                  active={category.id === active.id}
                  onClick={() => onCategoryChange(category.id)}
                  icon={<Icon size={14} />}
                >
                  {category.name}
                  {count > 0 && ` · ${count}`}
                </Chip>
              );
            })}
          </HScroll>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">{active.name}</span>
              <button
                type="button"
                onClick={() => onToggleCategory(active.id)}
                disabled={!allPicked && full}
                className="text-xs font-semibold text-indigo-600 disabled:text-slate-400"
              >
                {allPicked ? `Clear ${active.name}` : `Select all ${active.skills.length}`}
              </button>
            </div>
            <div role="group" aria-label={`${active.name} skills`} className="grid grid-cols-2 gap-2">
              {active.skills.map((skill) => tile(skill, false))}
            </div>
          </div>
        </>
      )}

      {selected.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-slate-900">Your services ({selected.length})</div>
          {selected.map((item) => {
            const name = categoryOf.get(item.skillId)?.skills.find((s) => s.id === item.skillId)?.name ?? item.skillId;
            return (
              <div key={item.skillId} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900">{name}</span>
                    <span className="text-[11px] text-slate-500">{categoryOf.get(item.skillId)?.name}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={() => onToggle(item.skillId)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 active:scale-95"
                  >
                    <X size={16} />
                  </button>
                </div>
                <Segmented<Proficiency>
                  block
                  size="small"
                  value={item.proficiency}
                  onChange={(value) => onProficiencyChange(item.skillId, value)}
                  options={PROFICIENCY_OPTIONS}
                  aria-label={`${name} level`}
                />
                <div className="mt-1 text-[11px] text-slate-500">{PROFICIENCY_HINT[item.proficiency]}</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <InputNumber
                    min={0}
                    max={60}
                    precision={0}
                    size="small"
                    value={item.yearsExperience}
                    onChange={(value) => onYearsChange(item.skillId, value)}
                    placeholder="0"
                    aria-label={`${name} years of experience`}
                    className="!w-16"
                  />
                  years of experience (optional)
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SkillPicker;
