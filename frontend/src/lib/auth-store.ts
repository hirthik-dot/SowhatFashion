import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  savedAddresses?: any[];
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isAuthModalOpen: boolean;
  redirectUrl: string | null;
  wishlist: string[];
  setUser: (user: User | null) => void;
  logout: () => void;
  openAuthModal: (redirectUrl?: string) => void;
  closeAuthModal: () => void;
  toggleWishlist: (productId: string) => void;
  setWishlist: (wishlist: string[]) => void;
  setRedirectUrl: (url: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoggedIn: false,
  isAuthModalOpen: false,
  redirectUrl: null,
  wishlist: [],

  setUser: (user) => set({ user, isLoggedIn: !!user }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      document.cookie = 'user_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    set({ user: null, isLoggedIn: false, wishlist: [] });
  },
  openAuthModal: (redirectUrl?: string) => set({ isAuthModalOpen: true, redirectUrl: redirectUrl || null }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setWishlist: (wishlist) => set({ wishlist }),
  setRedirectUrl: (url) => set({ redirectUrl: url }),
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
