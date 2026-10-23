import { InputNumber, Segmented } from 'antd';
import { Check, X } from 'lucide-react';
import type { ProviderSkill, SkillCategory } from '../../common/CommonDto';
import { Proficiency } from '../../common/CommonEnum';
import Chip from '../ui/Chip';
import HScroll from '../ui/HScroll';

const PROFICIENCY_OPTIONS = [
  { value: Proficiency.BEGINNER, label: 'Beginner' },
  { value: Proficiency.INTERMEDIATE, label: 'Intermediate' },
  { value: Proficiency.EXPERT, label: 'Expert' },
];

interface Props {
  categories: SkillCategory[];
  activeCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  selected: ProviderSkill[];
  onToggle: (skillId: string) => void;
  onProficiencyChange: (skillId: string, proficiency: Proficiency) => void;
  onYearsChange: (skillId: string, years: number | null) => void;
  max: number;
}

/** Browse skills by category, pick several, and rate each one. */
const SkillPicker = ({
  categories, activeCategoryId, onCategoryChange, selected, onToggle, onProficiencyChange, onYearsChange, max,
}: Props) => {
  const active = categories.find((c) => c.id === activeCategoryId) ?? categories[0];
  const skillNames = new Map(categories.flatMap((c) => c.skills.map((s) => [s.id, s.name] as const)));
  const selectedIds = new Set(selected.map((s) => s.skillId));
  const full = selected.length >= max;

  return (
    <div className="flex flex-col gap-5">
      <HScroll>
        {categories.map((category) => (
          <Chip key={category.id} active={category.id === active.id} onClick={() => onCategoryChange(category.id)}>
            {category.name}
          </Chip>
        ))}
      </HScroll>

      <div role="group" aria-label={`${active.name} skills`} className="grid grid-cols-2 gap-2">
        {active.skills.map((skill) => {
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
              {skill.name}
              {isSelected && <Check size={16} className="shrink-0" />}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-slate-900">Your skills and level</div>
          {selected.map((item) => {
            const name = skillNames.get(item.skillId) ?? item.skillId;
            return (
              <div key={item.skillId} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900">{name}</span>
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
