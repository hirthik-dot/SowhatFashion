'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { adminGetProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminUploadImage, adminGetCategories, adminGetProductVariants, adminGetProductSizeVariants } from '@/lib/api';
import ProductFilterAssignments from '@/components/admin/ProductFilterAssignments';
import ProductVariantManager from '@/components/admin/ProductVariantManager';
import ProductSizeVariantManager from '@/components/admin/ProductSizeVariantManager';
import type { ProductVariantForm } from '@/lib/product-variants';
import { emptyVariantForm } from '@/lib/product-variants';
import type { ProductSizeVariantForm } from '@/lib/product-size-variants';
import { formatPrice, productListKey } from '@/lib/utils';
import Image from 'next/image';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  
  const initialForm = {
    name: '',
    description: '',
    category: '',
    subCategory: '',
    price: 0,
    discountPrice: 0,
    sizes: ['M', 'L'],
    stock: 0,
    tags: '',
    images: [] as string[],
    variants: [] as ProductVariantForm[],
    sizeVariants: [] as ProductSizeVariantForm[],
    isBillingProduct: false,
    isFeatured: false,
    isNewArrival: false,
    isActive: true,
    filterTags: {} as Record<string, string[]>,
    slug: '',
  };
  const [formData, setFormData] = useState(initialForm);
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  const fetchProducts = async () => {
    try {
      const res = await adminGetProducts({ expand: false });
      setProducts(res.products || []);
    } catch (error) {
      console.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    adminGetCategories().then(res => setDbCategories(Array.isArray(res) ? res : [])).catch(() => {});
  }, []);

  const handleOpenModal = async (product?: any) => {
    if (product) {
      const productId = resolveProductId(product);
      setEditingId(productId);
      const ft = product.filterTags;
      const filterTags: Record<string, string[]> =
        ft instanceof Map
          ? Object.fromEntries(ft)
          : typeof ft === 'object' && ft
            ? ft
            : {};

      let variants: ProductVariantForm[] = [];
      let sizeVariants: ProductSizeVariantForm[] = [];
      let isBillingProduct = Boolean(product.isBillingProduct);
      try {
        const res = await adminGetProductVariants(productId);
        variants = (res.variants || []).map((v: any) => ({
          _id: String(v._id),
          slug: v.slug,
          colorName: v.colorName,
          colorHex: v.colorHex || '#000000',
          images: v.images || [],
          price: v.price ?? null,
          discountPrice: v.discountPrice ?? null,
          stock: v.stock ?? null,
          sku: v.sku || '',
          sortOrder: v.sortOrder,
          isActive: v.isActive !== false,
        }));
      } catch {
        variants = [];
      }

      try {
        const sizeRes = await adminGetProductSizeVariants(productId);
        isBillingProduct = Boolean(sizeRes.isBillingProduct ?? product.isBillingProduct);
        sizeVariants = (sizeRes.variants || []).map((v: any) => ({
          _id: String(v._id),
          slug: v.slug,
          sizeName: v.sizeName,
          ecommercePrice: v.ecommercePrice ?? null,
          ecommerceDiscountPrice: v.ecommerceDiscountPrice ?? null,
          billingPrice: v.billingPrice ?? null,
          stock: v.stock ?? null,
          effectivePrice: v.effectivePrice ?? null,
          images: v.images || [],
          sortOrder: v.sortOrder,
          isActive: v.isActive !== false,
          colorVariants: (v.colorVariants || []).map((cv: any) => ({
            _id: String(cv._id),
            slug: cv.slug,
            colorName: cv.colorName,
            colorHex: cv.colorHex || '#000000',
            images: cv.images || [],
            price: cv.price ?? null,
            discountPrice: cv.discountPrice ?? null,
            stock: cv.stock ?? null,
            sku: cv.sku || '',
            sortOrder: cv.sortOrder,
            isActive: cv.isActive !== false,
          })),
        }));
      } catch {
        sizeVariants = [];
      }

      // Fallback: convert legacy colors[] if no variants yet
      if (!variants.length && product.colors?.length) {
        variants = product.colors.map((c: any) => ({
          colorName: c.name,
          colorHex: c.hex || '#000000',
          images: c.imageIndex != null && product.images?.[c.imageIndex]
            ? [product.images[c.imageIndex], ...product.images.filter((_: string, i: number) => i !== c.imageIndex)]
            : product.images || [],
          isActive: true,
        }));
      }

      setFormData({
        ...product,
        name: resolveEditName(product),
        description: product.description || '',
        subCategory: product.subCategory || '',
        tags: product.tags?.join(', ') || '',
        variants,
        sizeVariants,
        isBillingProduct,
        slug: product.slug || '',
        filterTags,
      });
    } else {
      setEditingId(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      // Handle multiple uploads one by one
      for(let i=0; i<e.target.files.length; i++) {
        const res = await adminUploadImage(e.target.files[i]);
        if(res.url) uploadedUrls.push(res.url);
      }
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
    } catch (err) {
      alert('Failed to upload image. Make sure it is an image file and under 5MB.');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        tags: typeof formData.tags === 'string'
          ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : formData.tags,
        sizeVariants: (formData.sizeVariants || []).filter((v: ProductSizeVariantForm) =>
          formData.isBillingProduct ? v._id && v.sizeName.trim() : v.sizeName.trim()
        ).map((sv) => ({
          ...sv,
          colorVariants: (sv.colorVariants || []).filter((cv) => cv.colorName.trim()),
        })),
        variants: (formData.sizeVariants?.length ?? 0) > 0
          ? []
          : (formData.variants || []).filter((v: ProductVariantForm) => v.colorName.trim()),
        filterTags: formData.filterTags || {},
      };
      delete (payload as any).colors;
      delete (payload as any).isBillingProduct;

      if (editingId) {
        await adminUpdateProduct(editingId, payload);
      } else {
        await adminCreateProduct(payload);
      }
      handleCloseModal();
      fetchProducts();
    } catch (error) {
      alert('Failed to save product');
    }
  };

  const handleToggleVisibility = async (product: any) => {
    const productId = resolveProductId(product);
    const listKey = productListKey(product);
    setTogglingId(listKey);
    try {
      await adminUpdateProduct(productId, { isActive: !product.isActive });
      setProducts((prev) =>
        prev.map((p) =>
          resolveProductId(p) === productId ? { ...p, isActive: !product.isActive } : p
        )
      );
    } catch {
      alert('Failed to update product visibility');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await adminDeleteProduct(id);
        fetchProducts();
      } catch (error) {
        alert('Failed to delete product');
      }
    }
  };

  const availableSizes = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  const resolveProductId = (product: any) => String(product.parentProductId || product._id);
  const resolveEditName = (product: any) => {
    if (product.isSizeVariant && product.name) {
      return String(product.name).replace(/ \([^)]+\)$/, '');
    }
    if (product.isPriceVariant && product.name) {
      return String(product.name).replace(/ \(₹[\d,]+\)$/, '');
    }
    return product.name;
  };

  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const filteredProducts = products.filter(p => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterVisibility === 'visible' && !p.isActive) return false;
    if (filterVisibility === 'hidden' && p.isActive) return false;
    return true;
  });

  return (
    <div>
      <AdminHeader title="Products Management" />
      
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold font-playfair">All Products</h2>
          <button onClick={() => handleOpenModal()} className="btn-gold rounded px-6 py-2.5 shadow-sm text-sm flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Product
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-[var(--border)] shadow-sm mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Filter by Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)] text-sm"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Filter by Visibility</label>
            <select
              value={filterVisibility}
              onChange={(e) => setFilterVisibility(e.target.value)}
              className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)] text-sm"
            >
              <option value="">All (Visible & Hidden)</option>
              <option value="visible">Visible Only</option>
              <option value="hidden">Hidden Only</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-secondary)]">
              <tr>
                <th className="px-6 py-4 font-semibold">Image</th>
                <th className="px-6 py-4 font-semibold">Details</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold">Stock</th>
                <th className="px-6 py-4 font-semibold">Visibility</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Loading products...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-[var(--text-secondary)]">No products found matching the current filters.</td></tr>
              ) : filteredProducts.map((product) => (
                <tr key={productListKey(product)} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-12 h-16 relative rounded overflow-hidden border border-[var(--border)] bg-gray-100">
                      <Image src={product.images?.[0] || '/placeholder.jpg'} alt={product.name} fill className="object-cover" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-black">{product.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mt-1">{product.category}</div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {product.isSizeVariant ? (
                        <span className="bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Size variant</span>
                      ) : null}
                      {product.isPriceVariant ? (
                        <span className="bg-red-50 text-red-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Price batch</span>
                      ) : null}
                      {product.isFeatured && <span className="bg-[var(--gold-light)] text-black text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Featured</span>}
                      {product.isNewArrival && <span className="bg-[var(--sale-red)] text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">New</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold">{formatPrice(product.discountPrice > 0 ? product.discountPrice : product.price)}</div>
                    {product.discountPrice > 0 && <div className="text-xs text-[var(--text-secondary)] line-through">{formatPrice(product.price)}</div>}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    <span className={product.stock <= 5 ? 'text-[var(--sale-red)]' : ''}>{product.stock}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(product)}
                      disabled={togglingId === productListKey(product)}
                      title={product.isActive ? 'Visible to customers — click to hide' : 'Hidden from customers — click to show'}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors disabled:opacity-50 ${
                        product.isActive
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {togglingId === productListKey(product) ? (
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : product.isActive ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                      {product.isActive ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => handleOpenModal(product)} className="text-[var(--gold-hover)] hover:underline font-semibold">Edit</button>
                    <button onClick={() => handleDelete(resolveProductId(product))} className="text-[var(--sale-red)] hover:underline font-semibold">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold font-playfair">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                <button onClick={handleCloseModal} className="text-gray-500 hover:text-black">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-grow">
                <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Product Name</label>
                      <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Description (shared across all color variants)</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        placeholder="Product description shown on every color variant page..."
                        className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)] text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Category</label>
                      <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value, subCategory: ''})} className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]">
                        <option value="">Select Category</option>
                        {dbCategories.filter(c => !c.parentSlug).map(c => (
                          <option key={c._id} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Sub Category</label>
                      <select value={formData.subCategory} onChange={(e) => setFormData({...formData, subCategory: e.target.value})} className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]">
                        <option value="">None</option>
                        {dbCategories.filter(c => c.parentSlug === formData.category).map(c => (
                          <option key={c._id} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                        Stock{formData.isBillingProduct ? ' (managed in billing)' : ''}
                      </label>
                      <input
                        required={!formData.isBillingProduct}
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                        readOnly={formData.isBillingProduct}
                        className={`w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)] ${formData.isBillingProduct ? 'bg-gray-100 text-[var(--text-secondary)]' : ''}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                        Regular Price (₹){formData.isBillingProduct ? ' — edit per size below' : ''}
                      </label>
                      <input
                        required={!formData.isBillingProduct}
                        type="number"
                        min="1"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                        readOnly={formData.isBillingProduct}
                        className={`w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)] ${formData.isBillingProduct ? 'bg-gray-100 text-[var(--text-secondary)]' : ''}`}
                      />
                      {formData.isBillingProduct && (
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          Billing prices sync automatically. Use size variant overrides for e-commerce-only pricing.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                        Discount Price (₹){formData.isBillingProduct ? ' — per size below' : ''}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.discountPrice}
                        onChange={(e) => setFormData({...formData, discountPrice: Number(e.target.value)})}
                        readOnly={formData.isBillingProduct}
                        className={`w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)] ${formData.isBillingProduct ? 'bg-gray-100 text-[var(--text-secondary)]' : ''}`}
                      />
                    </div>

                    {!formData.isBillingProduct && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Available Sizes</label>
                      <div className="flex gap-3">
                        {availableSizes.map(size => (
                          <label key={size} className="flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={formData.sizes.includes(size)}
                              onChange={(e) => {
                                const newSizes = e.target.checked 
                                  ? [...formData.sizes, size]
                                  : formData.sizes.filter(s => s !== size);
                                setFormData({...formData, sizes: newSizes});
                              }}
                              className="w-4 h-4 accent-[var(--gold)]"
                            />
                            <span className="font-medium text-sm">{size}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    )}

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Tags (comma separated)</label>
                      <input type="text" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} placeholder="casual, summer, cotton" className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                    </div>

                    <div className="space-y-3 md:col-span-2 pt-4 border-t border-[var(--border)]">
                      <h4 className="text-sm font-bold uppercase tracking-wider">Shop Filter Categories</h4>
                      <ProductFilterAssignments
                        filterTags={formData.filterTags || {}}
                        onChange={(filterTags) => setFormData({ ...formData, filterTags })}
                        productHints={{
                          category: formData.category,
                          subCategory: formData.subCategory,
                          sizes: formData.sizes,
                          isFeatured: formData.isFeatured,
                          isNewArrival: formData.isNewArrival,
                        }}
                      />
                    </div>

                    <div className="space-y-3 md:col-span-2 pt-4 border-t border-[var(--border)]">
                      <h4 className="text-sm font-bold uppercase tracking-wider">Product Images</h4>
                      
                      <div className="flex flex-wrap gap-4">
                        {formData.images.map((img, idx) => (
                          <div key={idx} className="relative w-24 h-32 border border-[var(--border)] rounded overflow-hidden group">
                            <Image src={img} alt="Product img" fill className="object-cover" />
                            <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        ))}
                        
                        <label className="w-24 h-32 border-2 border-dashed border-[var(--border)] hover:border-[var(--gold)] hover:bg-[var(--gold-light)] transition-colors rounded flex flex-col items-center justify-center cursor-pointer text-gray-500">
                          {uploading ? (
                            <span className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full"></span>
                          ) : (
                            <>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              <span className="text-xs font-semibold">Upload</span>
                            </>
                          )}
                          <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3 md:col-span-2 pt-4 border-t border-[var(--border)]">
                      <ProductSizeVariantManager
                        variants={formData.sizeVariants || []}
                        baseSlug={formData.slug || formData.name}
                        isBillingProduct={formData.isBillingProduct}
                        onChange={(sizeVariants) => setFormData({ ...formData, sizeVariants })}
                      />
                    </div>

                    {(formData.sizeVariants?.length ?? 0) === 0 && (
                    <div className="space-y-3 md:col-span-2 pt-4 border-t border-[var(--border)]">
                      <ProductVariantManager
                        variants={formData.variants || []}
                        baseSlug={formData.slug || formData.name}
                        parentPrice={formData.price}
                        parentStock={formData.stock}
                        onChange={(variants) => setFormData({ ...formData, variants })}
                      />
                    </div>
                    )}

                    <div className="space-y-3 md:col-span-2 pt-4 border-t border-[var(--border)] grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded border border-[var(--border)]">
                        <input type="checkbox" checked={formData.isFeatured} onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})} className="w-5 h-5 accent-[var(--gold)]" />
                        <span className="font-semibold text-sm">Featured Product</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded border border-[var(--border)]">
                        <input type="checkbox" checked={formData.isNewArrival} onChange={(e) => setFormData({...formData, isNewArrival: e.target.checked})} className="w-5 h-5 accent-[var(--gold)]" />
                        <span className="font-semibold text-sm">New Arrival</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded border border-[var(--border)]">
                        <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 accent-[var(--success)]" />
                        <span className="font-semibold text-sm">Active (Visible)</span>
                      </label>
                    </div>

                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-[var(--border)] bg-gray-50 flex justify-end gap-3">
                <button onClick={handleCloseModal} type="button" className="px-6 py-2 border border-gray-300 rounded font-semibold text-gray-700 hover:bg-gray-100">Cancel</button>
                <button type="submit" form="product-form" disabled={uploading} className="btn-gold rounded px-8 py-2 disabled:opacity-50">Save Product</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
