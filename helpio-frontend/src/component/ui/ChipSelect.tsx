import Chip from './Chip';
import type { ChipOption } from './ChipMultiSelect';

type Props<T extends string | number> = {
  options: ChipOption<T>[];
  /** Selected value; `value`/`onChange` let it sit directly inside an antd `Form.Item` */
  value?: T;
  ariaLabel: string;
} & (
  | { allowClear?: false; onChange?: (value: T) => void }
  /** Tapping the picked chip again clears the choice (for optional fields) */
  | { allowClear: true; onChange?: (value: T | undefined) => void }
);

/** Single-choice chip group that wraps onto more lines (e.g. service radius). */
const ChipSelect = <T extends string | number>(props: Props<T>) => {
  const { options, value, ariaLabel } = props;
  const pick = (next: T) => {
    if (props.allowClear) props.onChange?.(next === value ? undefined : next);
    else props.onChange?.(next);
  };

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Chip key={option.value} active={option.value === value} disabled={option.disabled} onClick={() => pick(option.value)}>
          {option.label}
        </Chip>
      ))}
    </div>
  );
};

export default ChipSelect;
