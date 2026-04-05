export type CatalogueHomeSection = {
  id: string;
  label: string;
  isVisible: boolean;
  order: number;
  canDelete: boolean;
};

export const DEFAULT_CATALOGUE_HOME_SECTIONS: CatalogueHomeSection[] = [
  { id: 'offer-carousel', label: 'Offer Carousel', isVisible: true, order: 0, canDelete: false },
  { id: 'new-arrivals', label: 'New Arrivals', isVisible: true, order: 1, canDelete: true },
  { id: 'products-grid', label: 'Products Grid', isVisible: true, order: 2, canDelete: false },
  { id: 'combo-offers', label: 'Combo Offers', isVisible: true, order: 3, canDelete: true },
];

export function mergeCatalogueHomeSections(stored?: CatalogueHomeSection[] | null): CatalogueHomeSection[] {
  if (!stored?.length) return DEFAULT_CATALOGUE_HOME_SECTIONS.map((d) => ({ ...d }));
  const byId = new Map(stored.map((s) => [s.id, { ...s }]));
  const result: CatalogueHomeSection[] = [];
  for (const def of DEFAULT_CATALOGUE_HOME_SECTIONS) {
    const row = byId.get(def.id);
    if (row) {
      result.push({
        ...def,
        ...row,
        canDelete: def.canDelete,
        label: row.label || def.label,
      });
      byId.delete(def.id);
    } else {
      result.push({ ...def });
    }
  }
  for (const [, extra] of byId) {
    result.push(extra as CatalogueHomeSection);
  }
  return result.sort((a, b) => a.order - b.order);
}
