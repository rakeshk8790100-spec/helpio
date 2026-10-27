import {
  BrickWall,
  Bug,
  Cctv,
  Drill,
  Droplets,
  Hammer,
  LayoutGrid,
  PaintRoller,
  Snowflake,
  Sparkles,
  Sprout,
  Truck,
  WashingMachine,
  Wrench,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Catalogue category `icon` keys (set by the backend) → lucide icons */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  wrench: Wrench,
  zap: Zap,
  sparkles: Sparkles,
  paint: PaintRoller,
  snowflake: Snowflake,
  washing: WashingMachine,
  droplet: Droplets,
  hammer: Hammer,
  truck: Truck,
  bug: Bug,
  drill: Drill,
  brick: BrickWall,
  sprout: Sprout,
  cctv: Cctv,
};

/** Unknown keys fall back to a generic grid icon */
export const categoryIcon = (key: string): LucideIcon => CATEGORY_ICONS[key] ?? LayoutGrid;
