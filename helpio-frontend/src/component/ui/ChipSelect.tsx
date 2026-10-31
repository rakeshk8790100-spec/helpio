import Chip from './Chip';
import type { ChipOption } from './ChipMultiSelect';

interface Props<T extends string | number> {
  options: ChipOption<T>[];
  /** Selected value; `value`/`onChange` let it sit directly inside an antd `Form.Item` */
  value?: T;
  onChange?: (value: T) => void;
  ariaLabel: string;
}

/** Single-choice chip group that wraps onto more lines (e.g. service radius). */
const ChipSelect = <T extends string | number>({ options, value, onChange, ariaLabel }: Props<T>) => (
  <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
    {options.map((option) => (
      <Chip key={option.value} active={option.value === value} onClick={() => onChange?.(option.value)}>
        {option.label}
      </Chip>
    ))}
  </div>
);

export default ChipSelect;
