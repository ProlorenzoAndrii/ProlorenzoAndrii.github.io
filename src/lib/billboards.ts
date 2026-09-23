import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import raw from '../data/billboards.json';

export type MonthStatus = 'Free' | 'Busy';

export interface Photo {
  src: string;
  full: string;
  width: number;
  height: number;
}

export interface BillboardSide {
  label: string;
  photo: Photo | null;
  availability: { month: string; status: MonthStatus }[];
}

export interface Billboard {
  id: string;
  name: string;
  size: string;
  description: string;
  coordinates: [number, number];
  sides: BillboardSide[];
}

interface RawBillboard {
  description: string;
  coordinates: number[];
  sides: { label: string; image: string | null; availability: { month: string; status: string }[] }[];
}

const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/billboards/**/*.jpg', {
  eager: true,
});

// macOS may store Cyrillic file names decomposed (NFD), while the JSON uses NFC.
const photosByPath = new Map(
  Object.entries(files).map(([path, mod]) => [
    path.replace('/src/assets/billboards/', '').normalize('NFC'),
    mod.default,
  ]),
);

async function loadPhoto(path: string | null): Promise<Photo | null> {
  if (!path) return null;
  const meta = photosByPath.get(path.normalize('NFC'));
  if (!meta) throw new Error(`Billboard photo not found: ${path}`);

  const [thumb, full] = await Promise.all([
    getImage({ src: meta, width: 640, format: 'webp', quality: 72 }),
    getImage({ src: meta, width: 1600, format: 'webp', quality: 80 }),
  ]);

  return {
    src: thumb.src,
    full: full.src,
    width: Number(thumb.attributes.width),
    height: Number(thumb.attributes.height),
  };
}

let cache: Promise<Billboard[]> | undefined;

export function getBillboards(): Promise<Billboard[]> {
  cache ??= Promise.all(
    (raw as RawBillboard[]).map(async (b, i) => {
      const [name, sizeRaw = ''] = b.description.split(',').map((s) => s.trim());
      return {
        id: `bb-${i}`,
        name,
        size: sizeRaw.replace('*', '×'),
        description: b.description,
        coordinates: [b.coordinates[0], b.coordinates[1]] as [number, number],
        sides: await Promise.all(
          b.sides.map(async (s) => ({
            label: s.label,
            photo: await loadPhoto(s.image),
            availability: s.availability.map((a) => ({
              month: a.month,
              status: a.status as MonthStatus,
            })),
          })),
        ),
      };
    }),
  );
  return cache;
}
