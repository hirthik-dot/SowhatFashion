import { STORE_MAP_EMBED_URL, STORE_NAME, STORE_LOCATION } from '@/lib/contact';

export default function StoreMapSection() {
  return (
    <section className="bg-[var(--surface)]" aria-label="Store location map">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-10">
        <div className="overflow-hidden rounded-xl shadow-sm border border-[var(--border)]">
          <iframe
            title={`${STORE_NAME} location map`}
            src={STORE_MAP_EMBED_URL}
            className="w-full h-[320px] sm:h-[380px] md:h-[420px] border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <p className="sr-only">{STORE_NAME}, {STORE_LOCATION}</p>
      </div>
    </section>
  );
}
