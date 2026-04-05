'use client';

import { useState } from 'react';
import { adminSwitchHomepage } from '@/lib/api';

interface HomepageSwitcherProps {
  currentHomepage: 'allensolly' | 'magazine' | 'catalogue';
  onUpdate: (type: 'allensolly' | 'magazine' | 'catalogue') => void;
}

export default function HomepageSwitcher({ currentHomepage, onUpdate }: HomepageSwitcherProps) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const handleSwitch = async (type: 'allensolly' | 'magazine' | 'catalogue') => {
    if (type === currentHomepage) return;
    setLoading(true);
    try {
      await adminSwitchHomepage(type);
      onUpdate(type);
      
      const names = {
        allensolly: 'Allen Solly Style',
        magazine: 'Magazine Editorial',
        catalogue: 'Storefront Catalogue'
      };
      
      setToast(`Homepage switched to ${names[type]}!`);
      setTimeout(() => setToast(''), 3000);
    } catch (error) {
      console.error('Failed to switch homepage:', error);
      alert('Failed to switch homepage. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      id: 'allensolly' as const,
      title: 'Homepage 1',
      subtitle: 'Allen Solly Style',
      description: 'Clean, professional e-commerce layout built for standard shopping flows with carousels and grid categories.',
      icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM4 9h16'
    },
    {
      id: 'magazine' as const,
      title: 'Homepage 2',
      subtitle: 'Magazine Editorial',
      description: 'Bold, asymmetric, fashion magazine feel. Oversized typography, diagonal accents, and bento grids.',
      icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8'
    },
    {
      id: 'catalogue' as const,
      title: 'Homepage 3',
      subtitle: 'Storefront Catalogue',
      description: 'Structured, practical, catalogue-style. Highly browsable with category tab bars and quick filters.',
      icon: 'M4 6h16 M4 12h16 M4 18h16'
    }
  ];

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 bg-[var(--success)] text-white px-6 py-3 rounded shadow-lg z-50 flex items-center gap-2 toast-enter">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span className="font-medium">{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
          const isLive = currentHomepage === card.id;
          return (
            <div 
              key={card.id}
              className={`bg-white rounded-xl border-2 transition-all p-6 flex flex-col relative overflow-hidden ${
                isLive 
                  ? 'border-[var(--gold)] shadow-md' 
                  : 'border-[var(--border)] hover:border-[var(--gold-light)]'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${isLive ? 'bg-[var(--gold-light)] text-[var(--gold-hover)]' : 'bg-[var(--surface)] text-[var(--text-secondary)]'}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={card.icon} />
                  </svg>
                </div>
                {isLive && (
                  <span className="bg-[var(--success)] text-white text-[10px] font-bold px-2 py-1 flex items-center gap-1 rounded-sm uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    Live
                  </span>
                )}
              </div>
              
              <h3 className="font-bold text-lg mb-1">{card.title}</h3>
              <h4 className="text-[var(--gold-hover)] font-medium text-sm mb-3 font-playfair italic">{card.subtitle}</h4>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed flex-grow">
                {card.description}
              </p>

              <button
                onClick={() => handleSwitch(card.id)}
                disabled={isLive || loading}
                className={`mt-6 py-2.5 px-4 w-full rounded font-semibold text-sm transition-all flex justify-center items-center gap-2 ${
                  isLive 
                    ? 'bg-[var(--surface)] text-[var(--text-secondary)] cursor-default'
                    : 'btn-gold'
                }`}
              >
                {loading && !isLive ? (
                  <span className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full"></span>
                ) : isLive ? '✓ ACTIVATED' : 'SET AS LIVE'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
