interface OfferBadgeProps {
  type: 'flash' | 'combo' | 'seasonal' | 'sale' | 'new';
  text?: string;
  className?: string;
}

export default function OfferBadge({ type, text, className = '' }: OfferBadgeProps) {
  const styles: Record<string, string> = {
    flash: 'bg-[var(--sale-red)] text-white',
    sale: 'bg-[var(--sale-red)] text-white',
    combo: 'bg-[var(--gold)] text-black',
    seasonal: 'bg-[var(--success)] text-white',
    new: 'bg-[var(--gold)] text-black',
  };

  const labels: Record<string, string> = {
    flash: 'FLASH SALE',
    sale: 'SALE',
    combo: 'COMBO',
    seasonal: 'SEASONAL',
    new: 'NEW',
  };

  return (
    <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded tracking-wide ${styles[type] || styles.sale} ${className}`}>
      {text || labels[type] || 'OFFER'}
    </span>
  );
}
