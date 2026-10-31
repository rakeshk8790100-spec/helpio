import { LayoutGrid } from 'lucide-react';
import type { Category } from '../../common/CommonDto';
import IconTile from '../ui/IconTile';
import { categoryIcon } from './categoryIcons';

interface Props {
  categories: Category[];
  onSelect: (category: Category) => void;
  /** Adds a trailing "More" tile when set */
  onMore?: () => void;
  max?: number;
}

/** 4-column category grid. */
const CategoryGrid = ({ categories, onSelect, onMore, max = onMore ? 7 : 8 }: Props) => (
  <div className="grid grid-cols-4 gap-y-4">
    {categories.slice(0, max).map((c) => (
      <IconTile key={c.id} Icon={categoryIcon(c.icon)} label={c.name} onClick={() => onSelect(c)} />
    ))}
    {onMore && <IconTile Icon={LayoutGrid} label="More" onClick={onMore} />}
  </div>
);

export default CategoryGrid;
