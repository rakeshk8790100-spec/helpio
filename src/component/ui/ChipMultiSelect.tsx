import Chip from './Chip';

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  options: ChipOption<T>[];
  /** Selected values; `value`/`onChange` let it sit directly inside an antd `Form.Item` */
  value?: T[];
  onChange?: (value: T[]) => void;
  ariaLabel: string;
}

/** Multi-select chip group (e.g. working days). Keeps the options' order in the value. */
const ChipMultiSelect = <T extends string | number>({ options, value = [], onChange, ariaLabel }: Props<T>) => {
  const toggle = (option: T) => {
    const next = value.includes(option) ? value.filter((v) => v !== option) : [...value, option];
    onChange?.(options.map((o) => o.value).filter((v) => next.includes(v)));
  };

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Chip key={option.value} active={value.includes(option.value)} onClick={() => toggle(option.value)}>
          {option.label}
        </Chip>
      ))}
    </div>
  );
};

export default ChipMultiSelect;
