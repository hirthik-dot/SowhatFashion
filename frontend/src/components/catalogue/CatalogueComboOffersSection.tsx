'use client';

import ComboOfferBanner from '@/components/shared/ComboOfferBanner';

type Offer = {
  _id: string;
  slug: string;
  title: string;
  type?: string;
  description?: string;
  comboDetails?: string;
};

export default function CatalogueComboOffersSection({ offers }: { offers: Offer[] }) {
  const list = offers.filter((o) => o.type === 'combo');
  if (!list.length) return null;

  return (
    <section className="bg-[var(--surface)] py-14 px-6 border-t border-[var(--border)]">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <h2 className="font-playfair font-bold text-2xl md:text-3xl text-[var(--text-primary)] border-b border-[var(--border)] pb-4">
          Combo offers
        </h2>
        <div className="space-y-6">
          {list.map((offer) => (
            <ComboOfferBanner
              key={offer._id}
              title={offer.title}
              description={offer.comboDetails || offer.description || ''}
              variant="light"
              ctaText="SHOP COMBO"
              href={`/offers/${offer.slug}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
