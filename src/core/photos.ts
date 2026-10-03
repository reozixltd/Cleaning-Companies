/**
 * Resolves a photo slot name to an image in src/assets/photos/, if one exists.
 * Vite's import.meta.glob finds files at build time, so adding a photo needs no code change.
 */
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/photos/*.{jpg,jpeg,png,webp,avif}', { eager: true });

const bySlot = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  bySlot.set(path.split('/').pop()!.replace(/\.[a-z]+$/i, ''), mod.default);
}

export function getPhoto(slot: string): ImageMetadata | undefined {
  return bySlot.get(slot);
}

export function hasPhoto(slot: string): boolean {
  return bySlot.has(slot);
}
