const TAG_COLORS = [
  'tag-blue',
  'tag-indigo',
  'tag-purple',
  'tag-pink',
  'tag-red',
  'tag-orange',
  'tag-amber',
  'tag-yellow',
  'tag-lime',
  'tag-green',
  'tag-teal',
  'tag-cyan',
] as const;

/**
 * Get a deterministic color class for a tag based on its name.
 * Uses a simple hash to ensure the same tag always gets the same color.
 */
export function getTagColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
}
