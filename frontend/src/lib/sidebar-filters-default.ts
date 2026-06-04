import { sidebarConfigToFilterGroups } from '@/lib/sidebar-filters';

/** Default sidebar shape when API config is empty (matches backend catalogue defaults). */
export const DEFAULT_FILTER_GROUPS = sidebarConfigToFilterGroups([
  {
    id: 'price',
    label: 'Price',
    type: 'range_slider',
    filterKey: 'price',
    isVisible: true,
    order: 0,
    rangeConfig: { min: 199, max: 2999, step: 50, prefix: '₹' },
  },
  {
    id: 'promotions',
    label: 'Promotions',
    type: 'checkbox_list',
    filterKey: 'promotions',
    isVisible: true,
    order: 1,
    options: [
      { label: 'Flash Sale', value: 'flash-sale' },
      { label: 'New Arrivals', value: 'new-arrivals' },
      { label: 'Combo Offers', value: 'combo-offers' },
      { label: '50% OFF', value: '50-off' },
    ],
  },
  {
    id: 'size',
    label: 'Size',
    type: 'checkbox_list',
    filterKey: 'size',
    isVisible: true,
    order: 2,
    options: [
      { label: 'S', value: 'S' },
      { label: 'M', value: 'M' },
      { label: 'L', value: 'L' },
      { label: 'XL', value: 'XL' },
      { label: 'XXL', value: 'XXL' },
    ],
  },
  {
    id: 'category',
    label: 'Category',
    type: 'checkbox_list',
    filterKey: 'category',
    isVisible: true,
    order: 3,
    options: [
      { label: 'T-Shirts', value: 'tshirt' },
      { label: 'Shirts', value: 'shirt' },
      { label: 'Pants', value: 'pant' },
    ],
  },
  {
    id: 'discount',
    label: 'Discount',
    type: 'checkbox_list',
    filterKey: 'discount',
    isVisible: true,
    order: 4,
    options: [
      { label: '10% and above', value: '10' },
      { label: '20% and above', value: '20' },
      { label: '30% and above', value: '30' },
      { label: '50% and above', value: '50' },
    ],
  },
]);
