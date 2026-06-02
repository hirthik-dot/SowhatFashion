'use client';

import { useState } from 'react';
import { adminUpdateSettings, adminUploadImage } from '@/lib/api';
import Image from 'next/image';

interface PlaceholderEditorProps {
  settings: any;
  onUpdate: () => void;
  activeHomepage?: 'allensolly' | 'magazine' | 'catalogue';
}

export default function PlaceholderEditor({ settings, onUpdate, activeHomepage }: PlaceholderEditorProps) {
  const [activeTab, setActiveTab] = useState<'allensolly' | 'magazine' | 'catalogue'>(
    activeHomepage || 'allensolly'
  );
  const [loading, setLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const placeholders = settings?.placeholders || {
    allensolly: { heroImage: '', categoryTshirt: '', categoryShirt: '', categoryPant: '', instagramImages: [] },
    magazine: { heroImage: '', curatedStaplesImage: '' },
    catalogue: { carouselImages: [] }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, homepage: string, field: string, isArray: boolean = false, arrayIndex: number = -1) => {
    if (!e.target.files?.length) return;
    setUploadingField(`${homepage}-${field}${isArray ? `-${arrayIndex}` : ''}`);
    try {
      const res = await adminUploadImage(e.target.files[0]);
      if (res.url) {
        const updatedSettings = { ...settings, placeholders: { ...placeholders } };
        
        if (!updatedSettings.placeholders[homepage]) {
           updatedSettings.placeholders[homepage] = {};
        }

        if (isArray) {
          if (!updatedSettings.placeholders[homepage][field]) {
            updatedSettings.placeholders[homepage][field] = [];
          }
          if (arrayIndex >= 0) {
            updatedSettings.placeholders[homepage][field][arrayIndex] = res.url;
          } else {
            updatedSettings.placeholders[homepage][field].push(res.url);
          }
        } else {
          updatedSettings.placeholders[homepage][field] = res.url;
        }

        await adminUpdateSettings(updatedSettings);
        onUpdate();
      }
    } catch (err) {
      alert('Failed to upload image.');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const renderImageUpload = (title: string, homepage: string, field: string) => {
    const imageUrl = placeholders[homepage]?.[field];
    const isUploading = uploadingField === `${homepage}-${field}`;

    return (
      <div className="space-y-2">
        <label className="text-sm font-bold text-[var(--text-secondary)]">{title}</label>
        <div className="flex items-center gap-4">
          <div className="w-32 h-20 relative bg-gray-100 border border-[var(--border)] rounded overflow-hidden flex items-center justify-center">
             {imageUrl ? (
               <Image src={imageUrl} alt={title} fill className="object-cover" />
             ) : (
               <span className="text-xs text-gray-400">No Image</span>
             )}
          </div>
          <label className="btn-gold-outline px-4 py-2 text-xs rounded cursor-pointer whitespace-nowrap">
            {isUploading ? 'Uploading...' : (imageUrl ? 'Change Image' : 'Upload Image')}
            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, homepage, field)} className="hidden" disabled={isUploading} />
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl border border-[var(--border)] shadow-sm mt-8">
      <h2 className="text-xl font-bold font-playfair mb-6">Homepage Placeholder Images</h2>
      
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-6">
        <button onClick={() => setActiveTab('allensolly')} className={`px-4 py-3 text-sm font-bold uppercase tracking-wider ${activeTab === 'allensolly' ? 'border-b-2 border-[var(--gold)] text-[var(--gold)]' : 'text-gray-500 hover:text-black'}`}>Homepage 1</button>
        <button onClick={() => setActiveTab('magazine')} className={`px-4 py-3 text-sm font-bold uppercase tracking-wider ${activeTab === 'magazine' ? 'border-b-2 border-[var(--gold)] text-[var(--gold)]' : 'text-gray-500 hover:text-black'}`}>Homepage 2</button>
        <button onClick={() => setActiveTab('catalogue')} className={`px-4 py-3 text-sm font-bold uppercase tracking-wider ${activeTab === 'catalogue' ? 'border-b-2 border-[var(--gold)] text-[var(--gold)]' : 'text-gray-500 hover:text-black'}`}>Homepage 3</button>
      </div>

      <div className="space-y-8">
        {activeTab === 'allensolly' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {renderImageUpload('Hero Banner Background', 'allensolly', 'heroImage')}
            {renderImageUpload('T-Shirts Category Box', 'allensolly', 'categoryTshirt')}
            {renderImageUpload('Shirts Category Box', 'allensolly', 'categoryShirt')}
            {renderImageUpload('Pants Category Box', 'allensolly', 'categoryPant')}
            
            <div className="md:col-span-2 space-y-2 border-t pt-6">
              <label className="text-sm font-bold text-[var(--text-secondary)]">Instagram Feed Images (Up to 6)</label>
              <div className="flex flex-wrap gap-4">
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const url = placeholders.allensolly?.instagramImages?.[index];
                  const isUploading = uploadingField === `allensolly-instagramImages-${index}`;
                  return (
                    <div key={index} className="space-y-2 text-center">
                      <div className="w-24 h-24 relative bg-gray-100 border border-[var(--border)] rounded overflow-hidden flex items-center justify-center">
                        {url ? (
                          <Image src={url} alt={`Insta ${index}`} fill className="object-cover" />
                        ) : (
                          <span className="text-xs text-gray-400">Empty</span>
                        )}
                      </div>
                      <label className="text-[10px] uppercase font-bold text-[var(--gold)] cursor-pointer hover:underline inline-block">
                        {isUploading ? '...' : (url ? 'Replace' : 'Upload')}
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'allensolly', 'instagramImages', true, index)} className="hidden" disabled={isUploading} />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'magazine' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {renderImageUpload('Split Hero Background (Left side)', 'magazine', 'heroImage')}
            {renderImageUpload('Curated Staples Editor Image', 'magazine', 'curatedStaplesImage')}
          </div>
        )}

        {activeTab === 'catalogue' && (
          <p className="text-sm text-[var(--text-secondary)]">
            Homepage 3 images are managed in the <strong>Homepage 3 — Image Editor</strong> section below (full slots, stock picker, and live preview).
          </p>
        )}
      </div>
    </div>
  );
}
