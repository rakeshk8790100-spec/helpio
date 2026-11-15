
/* Photo and video rules, the same as the API's; one place for every picker. */

export interface MediaRules {
  types: readonly string[];
  maxBytes: number;
  /** Most files in one set (a job's photos, one stage update) */
  maxCount: number;
  /** For the file input's `accept` */
  accept: string;
  /** Shown when a file isn't allowed */
  hint: string;
}

const JOB_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'] as const;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Job photos and stage updates: JPG, PNG, WebP or MP4, 10 MB each, up to 6 */
export const JOB_MEDIA: MediaRules = {
  types: JOB_TYPES,
  maxBytes: 10 * 1024 * 1024,
  maxCount: 6,
  accept: JOB_TYPES.join(','),
  hint: 'Use JPG, PNG or WebP photos, or MP4 videos, up to 10 MB each.',
};

/** Profile photos: JPG, PNG or WebP, 5 MB */
export const AVATAR_MEDIA: MediaRules = {
  types: PHOTO_TYPES,
  maxBytes: 5 * 1024 * 1024,
  maxCount: 1,
  accept: PHOTO_TYPES.join(','),
  hint: 'Use a JPG, PNG or WebP photo up to 5 MB.',
};

/**
 * The files that fit the rules and the room left (`count` already picked), and what to tell the user about the
 * rest: wrong type or size, or too many.
 */
export const pickMedia = (files: File[], rules: MediaRules, count: number) => {
  const valid = files.filter((file) => rules.types.includes(file.type) && file.size <= rules.maxBytes);
  const room = Math.max(rules.maxCount - count, 0);
  const warnings = [
    ...(valid.length < files.length ? [rules.hint] : []),
    ...(valid.length > room ? [`Up to ${rules.maxCount} photos or videos.`] : []),
  ];
  return { accepted: valid.slice(0, room), warnings };
};
