import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  savedAddresses?: any[];
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  wishlist: string[];
  setUser: (user: User | null) => void;
  logout: () => void;
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  toggleWishlist: (productId: string) => void;
  setWishlist: (wishlist: string[]) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoggedIn: false,
  isAuthModalOpen: false,
  authModalTab: 'login',
  wishlist: [],

  setUser: (user) => set({ user, isLoggedIn: !!user }),
  logout: () => set({ user: null, isLoggedIn: false, wishlist: [] }),
  openAuthModal: (tab = 'login') => set({ isAuthModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setWishlist: (wishlist) => set({ wishlist }),
  toggleWishlist: (productId) => {
    const current = get().wishlist;
    // optimistic update
    if (current.includes(productId)) {
       set({ wishlist: current.filter(id => id !== productId) });
    } else {
       set({ wishlist: [...current, productId] });
    }
  }
}));
