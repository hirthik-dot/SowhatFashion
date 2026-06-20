export interface ProductColor {
  name: string;
  hex: string;
  /** Index into product.images to show when this color is selected */
  imageIndex?: number;
}

export function normalizeHex(hex: string): string {
  const cleaned = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return (
      '#' +
      cleaned
        .split('')
        .map((c) => c + c)
        .join('')
        .toLowerCase()
    );
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return '#' + cleaned.toLowerCase();
  }
  return '#000000';
}

export function isValidHex(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalizeHex(hex));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex);
  const match = normalized.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

/** Curated apparel-friendly palette for nearest-match naming from eyedropper picks. */
const NAMED_COLORS: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Off White', hex: '#f8f6f0' },
  { name: 'Ivory', hex: '#fffff0' },
  { name: 'Cream', hex: '#fffdd0' },
  { name: 'Beige', hex: '#f5f5dc' },
  { name: 'Ecru', hex: '#c2b280' },
  { name: 'Tan', hex: '#d2b48c' },
  { name: 'Camel', hex: '#c19a6b' },
  { name: 'Brown', hex: '#8b4513' },
  { name: 'Chocolate', hex: '#3d2314' },
  { name: 'Coffee', hex: '#6f4e37' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Charcoal', hex: '#36454f' },
  { name: 'Slate', hex: '#708090' },
  { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Heather Grey', hex: '#9aa297' },
  { name: 'Melange Grey', hex: '#8b8680' },
  { name: 'Red', hex: '#ff0000' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Wine', hex: '#722f37' },
  { name: 'Rust', hex: '#b7410e' },
  { name: 'Orange', hex: '#ff7f00' },
  { name: 'Peach', hex: '#ffcba4' },
  { name: 'Coral', hex: '#ff7f50' },
  { name: 'Pink', hex: '#ffc0cb' },
  { name: 'Rose', hex: '#ff007f' },
  { name: 'Magenta', hex: '#ff00ff' },
  { name: 'Yellow', hex: '#ffff00' },
  { name: 'Mustard', hex: '#ffdb58' },
  { name: 'Gold', hex: '#ffd700' },
  { name: 'Olive', hex: '#808000' },
  { name: 'Green', hex: '#008000' },
  { name: 'Forest Green', hex: '#228b22' },
  { name: 'Army Green', hex: '#4b5320' },
  { name: 'Mint', hex: '#98ff98' },
  { name: 'Teal', hex: '#008080' },
  { name: 'Turquoise', hex: '#40e0d0' },
  { name: 'Aqua', hex: '#00ffff' },
  { name: 'Blue', hex: '#0000ff' },
  { name: 'Navy Blue', hex: '#000080' },
  { name: 'Royal Blue', hex: '#4169e1' },
  { name: 'Cobalt Blue', hex: '#0047ab' },
  { name: 'Sky Blue', hex: '#87ceeb' },
  { name: 'Powder Blue', hex: '#b0e0e6' },
  { name: 'Light Blue', hex: '#add8e6' },
  { name: 'Denim Blue', hex: '#1560bd' },
  { name: 'Indigo', hex: '#4b0082' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Lavender', hex: '#e6e6fa' },
  { name: 'Violet', hex: '#ee82ee' },
  { name: 'Lilac', hex: '#c8a2c8' },
  { name: 'Plum', hex: '#8e4585' },
  { name: 'Mauve', hex: '#e0b0ff' },
  { name: 'Beetle Melange', hex: '#4a5d4e' },
  { name: 'Steel Blue', hex: '#4682b4' },
  { name: 'Midnight Blue', hex: '#191970' },
  { name: 'Petrol Blue', hex: '#005f6a' },
  { name: 'Sea Green', hex: '#2e8b57' },
  { name: 'Sage Green', hex: '#9caf88' },
  { name: 'Khaki', hex: '#c3b091' },
  { name: 'Sand', hex: '#c2b280' },
  { name: 'Nude', hex: '#e3bc9a' },
  { name: 'Blush', hex: '#de5d83' },
  { name: 'Wine Red', hex: '#722f37' },
  { name: 'Brick Red', hex: '#cb4154' },
  { name: 'Scarlet', hex: '#ff2400' },
  { name: 'Crimson', hex: '#dc143c' },
];

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

/** Derive a human-readable color name from a hex value (nearest palette match). */
export function hexToColorName(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'Custom';

  let bestName = 'Custom';
  let bestDist = Infinity;

  for (const entry of NAMED_COLORS) {
    const entryRgb = hexToRgb(entry.hex);
    if (!entryRgb) continue;
    const dist = colorDistance(rgb, entryRgb);
    if (dist < bestDist) {
      bestDist = dist;
      bestName = entry.name;
    }
  }

  return bestName;
}

/** Apply eyedropper / color-picker result: normalized hex + auto color name. */
export function applyPickedHex(hex: string): { colorHex: string; colorName: string } {
  const colorHex = normalizeHex(hex);
  return {
    colorHex,
    colorName: hexToColorName(colorHex),
  };
}

export function cartItemKey(productId: string, size: string, color?: string): string {
  return `${productId}|${size}|${color || ''}`;
}

export function getDisplayImages(
  images: string[],
  colors: ProductColor[] | undefined,
  selectedColorIndex: number
): string[] {
  if (!images.length) return [];
  if (!colors?.length) return images;

  const color = colors[selectedColorIndex];
  if (color?.imageIndex != null && images[color.imageIndex]) {
    const primary = images[color.imageIndex];
    const rest = images.filter((_, i) => i !== color.imageIndex);
    return [primary, ...rest];
  }
  return images;
}
