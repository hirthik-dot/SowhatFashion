'use client';

import { useEffect, useRef, useState } from 'react';
import { adminGetProducts, adminUpdateSettings, adminUploadVideo } from '@/lib/api';
import { isInstagramReelUrl, type HeroMediaType } from '@/lib/hero-media';

export default function HeroVideoProductEditor({
  settings,
  onUpdate,
}: {
  settings: any;
  onUpdate: () => void;
}) {
  const [heroMediaType, setHeroMediaType] = useState<HeroMediaType>(
    settings?.heroMediaType === 'video' ? 'video' : 'image'
  );
  const [heroVideoUrl, setHeroVideoUrl] = useState(settings?.heroVideoUrl || '');
  const [heroLinkedProductId, setHeroLinkedProductId] = useState(
    settings?.heroLinkedProductId || ''
  );
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHeroMediaType(settings?.heroMediaType === 'video' ? 'video' : 'image');
    setHeroVideoUrl(settings?.heroVideoUrl || '');
    setHeroLinkedProductId(settings?.heroLinkedProductId || '');
  }, [settings]);

  useEffect(() => {
    adminGetProducts()
      .then((data) => setProducts(data?.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  const handleVideoFile = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert('Video must be 50MB or smaller');
      return;
    }
    setUploading(true);
    try {
      const res = await adminUploadVideo(file);
      if (res.url) {
        setHeroVideoUrl(res.url);
        setToast('Video uploaded — click Save hero settings');
        setTimeout(() => setToast(''), 5000);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Video upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (heroMediaType === 'video' && heroVideoUrl.trim() && isInstagramReelUrl(heroVideoUrl)) {
      alert(
        'Instagram links cannot autoplay on your site. Upload the reel as an MP4 file instead (use Upload hero video below).'
      );
      return;
    }
    setSaving(true);
    try {
      const linked = products.find((p) => String(p._id) === String(heroLinkedProductId));
      await adminUpdateSettings({
        heroMediaType,
        heroVideoUrl: heroMediaType === 'video' ? heroVideoUrl.trim() : '',
        heroLinkedProductId: heroLinkedProductId || '',
        heroLinkedProductSlug: linked?.slug || '',
      });
      setToast('Hero settings saved');
      setTimeout(() => setToast(''), 4000);
      onUpdate();
    } catch {
      alert('Failed to save hero settings');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (p: any) => {
    const amount = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price;
    return amount != null ? `₹${Number(amount).toLocaleString('en-IN')}` : '';
  };

  const instagramBlocked = isInstagramReelUrl(heroVideoUrl);

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl border border-[var(--border)] shadow-sm mt-8">
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleVideoFile(f);
          e.target.value = '';
        }}
      />

      {toast && (
        <div className="fixed top-4 right-4 z-[400] bg-[var(--success)] text-white px-6 py-3 shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      <h2 className="text-xl font-bold font-playfair mb-1">Hero Video &amp; Product Link</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Choose image or video for the catalogue homepage hero. Link Shop Now to a product.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button
          type="button"
          onClick={() => setHeroMediaType('image')}
          className={`rounded-xl border-2 p-5 text-left transition-all ${
            heroMediaType === 'image'
              ? 'border-[var(--gold)] shadow-md bg-[var(--gold-light)]/30'
              : 'border-[var(--border)] hover:border-[var(--gold-light)]'
          }`}
        >
          <p className="font-bold text-sm uppercase tracking-wider mb-1">Hero image</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Use desktop/mobile hero images from the Homepage 3 image editor below.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setHeroMediaType('video')}
          className={`rounded-xl border-2 p-5 text-left transition-all ${
            heroMediaType === 'video'
              ? 'border-[var(--gold)] shadow-md bg-[var(--gold-light)]/30'
              : 'border-[var(--border)] hover:border-[var(--gold-light)]'
          }`}
        >
          <p className="font-bold text-sm uppercase tracking-wider mb-1">Hero video</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Upload an MP4 for silent autoplay on loop (like a reel). Instagram links will not work.
          </p>
        </button>
      </div>

      {heroMediaType === 'video' && (
        <div className="space-y-4 mb-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <strong>Instagram reels cannot play on your homepage.</strong> Meta only allows “Play on
            Instagram” in embeds. Download your reel as MP4 (or export from your editor) and upload it
            here for reel-style autoplay.
          </div>

          <div>
            <label className="text-sm font-bold text-[var(--text-secondary)] block mb-2">
              Upload hero video (recommended)
            </label>
            <button
              type="button"
              disabled={uploading}
              onClick={() => videoInputRef.current?.click()}
              className="btn-gold-outline text-xs px-4 py-2 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload MP4 / MOV / WebM'}
            </button>
            <p className="text-xs text-[var(--text-secondary)] mt-2">Max 50MB. Stored on Cloudinary.</p>
          </div>

          {heroVideoUrl && !instagramBlocked && (
            <div className="relative w-full max-w-xs aspect-[9/16] bg-black rounded overflow-hidden">
              <video
                src={heroVideoUrl}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                autoPlay
              />
            </div>
          )}

          <div>
            <label className="text-sm font-bold text-[var(--text-secondary)]">Or paste direct video URL</label>
            <input
              type="url"
              value={heroVideoUrl}
              onChange={(e) => setHeroVideoUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/…/video.mp4"
              className={`w-full border px-3 py-2.5 text-sm mt-1 ${
                instagramBlocked ? 'border-red-400 bg-red-50' : 'border-[var(--border)]'
              }`}
            />
            {instagramBlocked && (
              <p className="text-xs text-red-600 mt-1">
                Remove the Instagram link and upload an MP4 file instead.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2 mb-8">
        <label className="text-sm font-bold text-[var(--text-secondary)]">Linked product (Shop Now)</label>
        <select
          value={heroLinkedProductId}
          onChange={(e) => setHeroLinkedProductId(e.target.value)}
          disabled={loadingProducts}
          className="w-full border border-[var(--border)] px-3 py-2.5 text-sm bg-white"
        >
          <option value="">None — link to all products</option>
          {products.map((product) => (
            <option key={product._id} value={product._id}>
              {product.name}
              {formatPrice(product) ? ` — ${formatPrice(product)}` : ''}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving || uploading}
        className="bg-[#111] text-white py-3 px-8 text-sm uppercase tracking-widest font-semibold disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save hero settings'}
      </button>
    </div>
  );
}
