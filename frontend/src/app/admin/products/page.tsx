'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { adminGetProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminUploadImage, adminGetCategories } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const initialForm = {
    name: '',
    category: '',
    subCategory: '',
    price: 0,
    discountPrice: 0,
    sizes: ['M', 'L'],
    stock: 0,
    tags: '',
    images: [] as string[],
    isFeatured: false,
    isNewArrival: false,
    isActive: true
  };
  const [formData, setFormData] = useState(initialForm);
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  const fetchProducts = async () => {
    try {
      const res = await adminGetProducts();
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

  const handleOpenModal = (product?: any) => {
    if (product) {
      setEditingId(product._id);
      setFormData({
        ...product,
        subCategory: product.subCategory || '',
        tags: product.tags?.join(', ') || ''
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
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

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

        {/* Products Table */}
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-secondary)]">
              <tr>
                <th className="px-6 py-4 font-semibold">Image</th>
                <th className="px-6 py-4 font-semibold">Details</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold">Stock</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Loading products...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-[var(--text-secondary)]">No products found. Add one to get started.</td></tr>
              ) : products.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-12 h-16 relative rounded overflow-hidden border border-[var(--border)] bg-gray-100">
                      <Image src={product.images?.[0] || '/placeholder.jpg'} alt={product.name} fill className="object-cover" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-black">{product.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mt-1">{product.category}</div>
                    <div className="flex gap-1 mt-1">
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
                    <span className={`w-2.5 h-2.5 rounded-full inline-block mr-2 ${product.isActive ? 'bg-[var(--success)]' : 'bg-gray-400'}`}></span>
                    {product.isActive ? 'Active' : 'Draft'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => handleOpenModal(product)} className="text-[var(--gold-hover)] hover:underline font-semibold">Edit</button>
                    <button onClick={() => handleDelete(product._id)} className="text-[var(--sale-red)] hover:underline font-semibold">Delete</button>
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
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Stock</label>
                      <input required type="number" min="0" value={formData.stock} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Regular Price (₹)</label>
                      <input required type="number" min="1" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Discount Price (₹)</label>
                      <input type="number" min="0" value={formData.discountPrice} onChange={(e) => setFormData({...formData, discountPrice: Number(e.target.value)})} className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                    </div>

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

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Tags (comma separated)</label>
                      <input type="text" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} placeholder="casual, summer, cotton" className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
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
