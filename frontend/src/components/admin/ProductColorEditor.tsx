'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { ProductColor } from '@/lib/product-colors';
import { isValidHex, normalizeHex } from '@/lib/product-colors';

type Props = {
  colors: ProductColor[];
  images: string[];
  onChange: (colors: ProductColor[]) => void;
};

function emptyColor(): ProductColor {
  return { name: '', hex: '#000000' };
}

/** Pick color from screen using native EyeDropper API (Chrome, Edge). */
async function pickColorFromScreen(): Promise<string | null> {
  if (typeof window === 'undefined' || !('EyeDropper' in window)) return null;
  try {
    const dropper = new (window as Window & { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
    const result = await dropper.open();
    return normalizeHex(result.sRGBHex);
  } catch {
    return null;
  }
}

/** Pick color by clicking a point on a product image (canvas fallback). */
function pickColorFromImage(
  img: HTMLImageElement,
  clientX: number,
  clientY: number,
  containerRect: DOMRect
): string | null {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  if (!naturalW || !naturalH) return null;

  const displayW = containerRect.width;
  const displayH = containerRect.height;
  const imgAspect = naturalW / naturalH;
  const boxAspect = displayW / displayH;

  let drawW: number;
  let drawH: number;
  let offsetX: number;
  let offsetY: number;

  if (imgAspect > boxAspect) {
    drawW = displayW;
    drawH = displayW / imgAspect;
    offsetX = 0;
    offsetY = (displayH - drawH) / 2;
  } else {
    drawH = displayH;
    drawW = displayH * imgAspect;
    offsetX = (displayW - drawW) / 2;
    offsetY = 0;
  }

  const relX = clientX - containerRect.left - offsetX;
  const relY = clientY - containerRect.top - offsetY;
  if (relX < 0 || relY < 0 || relX > drawW || relY > drawH) return null;

  const px = Math.floor((relX / drawW) * naturalW);
  const py = Math.floor((relY / drawH) * naturalH);

  canvas.width = naturalW;
  canvas.height = naturalH;
  try {
    ctx.drawImage(img, 0, 0, naturalW, naturalH);
    const data = ctx.getImageData(px, py, 1, 1).data;
    const hex =
      '#' +
      [data[0], data[1], data[2]]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
    return normalizeHex(hex);
  } catch {
    return null;
  }
}

function ImageColorPickerModal({
  imageUrl,
  onPick,
  onClose,
}: {
  imageUrl: string;
  onPick: (hex: string) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });
  const [previewHex, setPreviewHex] = useState('#000000');
  const [corsError, setCorsError] = useState(false);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;
    const rect = container.getBoundingClientRect();
    const hex = pickColorFromImage(img, e.clientX, e.clientY, rect);
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true });
    if (hex) setPreviewHex(hex);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      const img = imgRef.current;
      if (!container || !img) return;
      const rect = container.getBoundingClientRect();
      const hex = pickColorFromImage(img, e.clientX, e.clientY, rect);
      if (hex) {
        onPick(hex);
        onClose();
      } else {
        setCorsError(true);
      }
    },
    [onPick, onClose]
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
          <div>
            <h3 className="font-bold">Pick color from image</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Click anywhere on the product photo</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-black p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative aspect-[3/4] bg-gray-100 cursor-crosshair select-none"
          onMouseMove={handleMove}
          onMouseLeave={() => setCursor((c) => ({ ...c, visible: false }))}
          onClick={handleClick}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Pick color"
            crossOrigin="anonymous"
            className="w-full h-full object-contain"
            onError={() => setCorsError(true)}
          />
          {cursor.visible && (
            <div
              className="absolute pointer-events-none w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg"
              style={{
                left: cursor.x,
                top: cursor.y,
                backgroundColor: previewHex,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.5)',
              }}
            />
          )}
        </div>

        <div className="p-4 flex items-center gap-3 border-t border-[var(--border)]">
          <div
            className="w-10 h-10 rounded-full border border-[var(--border)] shrink-0"
            style={{ backgroundColor: previewHex }}
          />
          <span className="font-mono text-sm">{previewHex}</span>
          {corsError && (
            <span className="text-xs text-amber-700 ml-auto">
              Use the screen eyedropper if click-pick fails
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductColorEditor({ colors, images, onChange }: Props) {
  const [pickerState, setPickerState] = useState<{ colorIndex: number; imageIndex: number } | null>(null);
  const [hasEyeDropper, setHasEyeDropper] = useState(false);

  useEffect(() => {
    setHasEyeDropper('EyeDropper' in window);
  }, []);

  const updateColor = (index: number, patch: Partial<ProductColor>) => {
    const next = colors.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange(next);
  };

  const addColor = () => onChange([...colors, emptyColor()]);

  const removeColor = (index: number) => onChange(colors.filter((_, i) => i !== index));

  const handleScreenPick = async (index: number) => {
    const hex = await pickColorFromScreen();
    if (hex) updateColor(index, { hex });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider">Available Colors</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Add colors shoppers can select. Use the eyedropper on product images or anywhere on screen.
          </p>
        </div>
        <button
          type="button"
          onClick={addColor}
          className="shrink-0 text-xs font-bold uppercase tracking-wider px-3 py-2 border border-[var(--border)] rounded hover:border-[var(--gold)] hover:bg-[var(--gold-light)] transition-colors"
        >
          + Add Color
        </button>
      </div>

      {colors.length === 0 ? (
        <div className="border border-dashed border-[var(--border)] rounded-lg p-6 text-center text-sm text-[var(--text-secondary)]">
          No colors yet. Add at least one color for customers to choose on the product page.
        </div>
      ) : (
        <div className="space-y-3">
          {colors.map((color, index) => (
            <div
              key={index}
              className="border border-[var(--border)] rounded-lg p-4 bg-gray-50/50 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-full border-2 border-white shadow shrink-0 ring-1 ring-[var(--border)]"
                  style={{ backgroundColor: isValidHex(color.hex) ? normalizeHex(color.hex) : '#ccc' }}
                  title={color.hex}
                />

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Color name</label>
                    <input
                      type="text"
                      value={color.name}
                      onChange={(e) => updateColor(index, { name: e.target.value })}
                      placeholder="e.g. Navy Blue"
                      className="w-full mt-1 border border-[var(--border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Hex code</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={color.hex}
                        onChange={(e) => updateColor(index, { hex: e.target.value })}
                        placeholder="#1a2b4c"
                        className="flex-1 border border-[var(--border)] rounded px-3 py-2 text-sm font-mono outline-none focus:border-[var(--gold)]"
                      />
                      <input
                        type="color"
                        value={isValidHex(color.hex) ? normalizeHex(color.hex) : '#000000'}
                        onChange={(e) => updateColor(index, { hex: e.target.value })}
                        className="w-11 h-10 rounded border border-[var(--border)] cursor-pointer p-0.5"
                        title="Color picker"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeColor(index)}
                  className="text-[var(--text-secondary)] hover:text-[var(--sale-red)] p-1 shrink-0"
                  title="Remove color"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border)]">
                <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] mr-1">Eyedropper:</span>

                {hasEyeDropper && (
                  <button
                    type="button"
                    onClick={() => handleScreenPick(index)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border border-[var(--border)] bg-white hover:border-[var(--gold)] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 22l1-1M20 2l-2 2M7.5 7.5L3 12l8 8 4.5-4.5M15 6l3-3" />
                      <path d="M18 3l3 3" />
                    </svg>
                    Screen picker
                  </button>
                )}

                {images.length > 0 ? (
                  images.map((img, imgIdx) => (
                    <button
                      key={imgIdx}
                      type="button"
                      onClick={() => setPickerState({ colorIndex: index, imageIndex: imgIdx })}
                      className="relative w-10 h-12 rounded border-2 border-[var(--border)] overflow-hidden hover:border-[var(--gold)] transition-colors group"
                      title={`Pick from image ${imgIdx + 1}`}
                    >
                      <Image src={img} alt={`Image ${imgIdx + 1}`} fill className="object-cover" sizes="40px" />
                      <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <path d="M2 22l1-1M20 2l-2 2M7.5 7.5L3 12l8 8 4.5-4.5" />
                        </svg>
                      </span>
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-[var(--text-secondary)]">Upload images to pick colors from photos</span>
                )}

                {images.length > 0 && (
                  <div className="ml-auto flex items-center gap-2">
                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Show image:</label>
                    <select
                      value={color.imageIndex ?? ''}
                      onChange={(e) =>
                        updateColor(index, {
                          imageIndex: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className="text-xs border border-[var(--border)] rounded px-2 py-1.5 outline-none focus:border-[var(--gold)]"
                    >
                      <option value="">Default (first)</option>
                      {images.map((_, imgIdx) => (
                        <option key={imgIdx} value={imgIdx}>
                          Image {imgIdx + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pickerState && images[pickerState.imageIndex] && (
        <ImageColorPickerModal
          imageUrl={images[pickerState.imageIndex]}
          onPick={(hex) => updateColor(pickerState.colorIndex, { hex, imageIndex: pickerState.imageIndex })}
          onClose={() => setPickerState(null)}
        />
      )}
    </div>
  );
}
