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
  /** True after the initial /api/auth/me check on app load */
  authChecked: boolean;
  isAuthModalOpen: boolean;
  redirectUrl: string | null;
  wishlist: string[];
  /** Short-lived message shown after OTP / Google sign-in */
  signInToast: string | null;
  setUser: (user: User | null) => void;
  setAuthChecked: (checked: boolean) => void;
  logout: () => void;
  openAuthModal: (redirectUrl?: string) => void;
  closeAuthModal: () => void;
  toggleWishlist: (productId: string) => void;
  setWishlist: (wishlist: string[]) => void;
  setRedirectUrl: (url: string | null) => void;
  showSignInToast: (message?: string) => void;
  clearSignInToast: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoggedIn: false,
  authChecked: false,
  isAuthModalOpen: false,
  redirectUrl: null,
  wishlist: [],
  signInToast: null,

  setUser: (user) => set({ user, isLoggedIn: !!user }),
  setAuthChecked: (checked) => set({ authChecked: checked }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      document.cookie = 'user_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    set({ user: null, isLoggedIn: false, wishlist: [], signInToast: null });
  },
  showSignInToast: (message) =>
    set({ signInToast: message?.trim() || 'Successfully signed in' }),
  clearSignInToast: () => set({ signInToast: null }),
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
