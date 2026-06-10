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
