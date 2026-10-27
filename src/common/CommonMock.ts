import type { Category, Service } from './CommonDto';

/* Shared catalogue mocks used by several screens until the backend is ready. */

export const MOCK_CATEGORIES: Category[] = [
  { id: 'plumbing', name: 'Plumbing', icon: 'wrench' },
  { id: 'electrical', name: 'Electrical', icon: 'zap' },
  { id: 'cleaning', name: 'Cleaning', icon: 'sparkles' },
  { id: 'painting', name: 'Painting', icon: 'paint' },
  { id: 'ac', name: 'AC Repair', icon: 'snowflake' },
  { id: 'appliance', name: 'Appliance repair', icon: 'washing' },
  { id: 'water', name: 'Water purifier & geyser', icon: 'droplet' },
  { id: 'carpentry', name: 'Carpentry', icon: 'hammer' },
  { id: 'moving', name: 'Moving', icon: 'truck' },
  { id: 'pest', name: 'Pest control', icon: 'bug' },
  { id: 'handyman', name: 'Handyman', icon: 'drill' },
  { id: 'masonry', name: 'Masonry & tiling', icon: 'brick' },
  { id: 'gardening', name: 'Gardening', icon: 'sprout' },
  { id: 'security', name: 'Home security & smart home', icon: 'cctv' },
];

export const MOCK_SERVICES: Service[] = [
  { id: 's1', name: 'Tap & leak repair', categoryId: 'plumbing', fromPrice: 299, rating: 4.8, reviews: 1240, durationMins: 45 },
  { id: 's2', name: 'Deep home cleaning', categoryId: 'cleaning', fromPrice: 1499, rating: 4.7, reviews: 860, durationMins: 240 },
  { id: 's3', name: 'AC service & gas refill', categoryId: 'ac', fromPrice: 599, rating: 4.6, reviews: 2103, durationMins: 60 },
  { id: 's4', name: 'Fan / light installation', categoryId: 'electrical', fromPrice: 199, rating: 4.9, reviews: 540, durationMins: 30 },
  { id: 's5', name: 'Wall painting (per room)', categoryId: 'painting', fromPrice: 2999, rating: 4.5, reviews: 312, durationMins: 480 },
  { id: 's6', name: 'Furniture assembly', categoryId: 'carpentry', fromPrice: 399, rating: 4.7, reviews: 420, durationMins: 90 },
  { id: 's7', name: 'Mini truck shifting', categoryId: 'moving', fromPrice: 1999, rating: 4.4, reviews: 188, durationMins: 180 },
];
