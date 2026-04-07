"use client";

import { create } from "zustand";
import { billingApi } from "@/lib/api";

export type PaymentMethod = "cash" | "gpay" | "upi" | "card" | "partial";
export type PaymentSplitMethod = "cash" | "gpay" | "upi" | "card";
export type DiscountType = "percent" | "amount" | "none";

export type BillItem = {
  product: string;
  productId?: string;
  stockItemId?: string;
  barcode: string;
  name: string;
  category?: string;
  size?: string;
  mrp: number;
  stock?: number;
  quantity: number;
  itemDiscountType: DiscountType;
  itemDiscountValue: number;
};

export type BillTab = {
  id: string;
  billNumber: string | null;
  customer: { name: string; phone: string };
  salesmanId: string;
  paymentMethod: PaymentMethod;
  paymentBreakdown: Array<{ method: PaymentSplitMethod; amount: number }>;
  items: BillItem[];
  billDiscountType: DiscountType;
  billDiscountValue: number;
  cashReceived: number;
  status: "active" | "held";
  createdAt: string;
};

export type BillTotals = {
  subtotal: number;
  totalItemDiscount: number;
  afterItemDiscount: number;
  billDiscountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  roundOff: number;
  totalAmount: number;
  changeReturned: number;
};

type BillState = {
  tabs: BillTab[];
  activeTabId: string;
  heldBills: any[];
  createTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  addItem: (tabId: string, product: any) => void;
  removeItem: (tabId: string, itemIndex: number) => void;
  updateItemDiscount: (tabId: string, itemIndex: number, type: "percent" | "amount", value: number) => void;
  updateQuantity: (tabId: string, itemIndex: number, qty: number) => void;
  setCustomer: (tabId: string, name: string, phone: string) => void;
  setSalesman: (tabId: string, salesmanId: string) => void;
  setPaymentMethod: (tabId: string, method: PaymentMethod) => void;
  addPaymentSplit: (tabId: string, method: PaymentSplitMethod, amount: number) => void;
  removePaymentSplit: (tabId: string, index: number) => void;
  updatePaymentSplit: (tabId: string, index: number, amount: number) => void;
  setBillDiscount: (tabId: string, type: DiscountType, value: number) => void;
  setCashReceived: (tabId: string, amount: number) => void;
  holdBill: (tabId: string) => Promise<any>;
  resumeHeldBill: (bill: any) => void;
  clearTab: (tabId: string) => void;
  fetchHeldBills: () => Promise<void>;
  discardHeldBill: (id: string) => Promise<void>;
  computedTotals: (tabId: string) => BillTotals;
  totalPaid: (tabId: string) => number;
  remainingAmount: (tabId: string) => number;
};

const makeTab = (): BillTab => ({
  id: crypto.randomUUID(),
  billNumber: null,
  customer: { name: "", phone: "" },
  salesmanId: "",
  paymentMethod: "cash",
  paymentBreakdown: [],
  items: [],
  billDiscountType: "none",
  billDiscountValue: 0,
  cashReceived: 0,
  status: "active",
  createdAt: new Date().toISOString(),
});

const computeTotals = (tab?: BillTab): BillTotals => {
  const items = tab?.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.mrp * item.quantity, 0);
  const totalItemDiscount = items.reduce((sum, item) => {
    if (item.itemDiscountType === "percent") {
      return sum + ((item.mrp * item.itemDiscountValue) / 100) * item.quantity;
    }
    if (item.itemDiscountType === "amount") {
      return sum + item.itemDiscountValue * item.quantity;
    }
    return sum;
  }, 0);
  const afterItemDiscount = Math.max(0, subtotal - totalItemDiscount);
  let billDiscountAmount = 0;
  if (tab?.billDiscountType === "percent") {
    billDiscountAmount = (afterItemDiscount * tab.billDiscountValue) / 100;
  } else if (tab?.billDiscountType === "amount") {
    billDiscountAmount = tab.billDiscountValue;
  }
  billDiscountAmount = Math.min(afterItemDiscount, Math.max(0, billDiscountAmount));
  const taxableAmount = Math.max(0, afterItemDiscount - billDiscountAmount);
  const gstAmount = taxableAmount * 0.05;
  const raw = taxableAmount + gstAmount;
  const roundOff = Math.round(raw) - raw;
  const totalAmount = Math.round(raw);
  const cashPortion =
    tab?.paymentMethod === "partial"
      ? (tab.paymentBreakdown || [])
          .filter((entry) => entry.method === "cash")
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
      : tab?.paymentMethod === "cash"
      ? totalAmount
      : 0;
  const changeReturned = Math.max(0, Number(tab?.cashReceived || 0) - cashPortion);
  return { subtotal, totalItemDiscount, afterItemDiscount, billDiscountAmount, taxableAmount, gstAmount, roundOff, totalAmount, changeReturned };
};

export const useBillStore = create<BillState>((set, get) => ({
  tabs: [makeTab()],
  activeTabId: "",
  heldBills: [],
  createTab: () => {
    const current = get().tabs;
    if (current.length >= 5) return;
    const next = makeTab();
    set({ tabs: [...current, next], activeTabId: next.id });
  },
  closeTab: (id) =>
    set((state) => {
      const tabs = state.tabs.filter((tab) => tab.id !== id);
      if (tabs.length === 0) {
        const next = makeTab();
        return { tabs: [next], activeTabId: next.id };
      }
      return { tabs, activeTabId: state.activeTabId === id ? tabs[0].id : state.activeTabId };
    }),
  setActiveTab: (id) => set({ activeTabId: id }),
  addItem: (tabId, product) =>
    set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        const existing = tab.items.find((item) => item.barcode === product.barcode);
        if (existing) {
          // Each barcode represents a unique physical unit; don't increase quantity for same barcode.
          return tab;
        }
        return {
          ...tab,
          items: [
            ...tab.items,
            {
              product: product.productId || product._id,
              productId: product.productId || product._id,
              stockItemId: product.stockItemId,
              barcode: product.barcode,
              name: product.name,
              category: product.category || "",
              size: product.size || "",
              mrp: Number(product.mrp || product.price || 0),
              stock: 1,
              quantity: 1,
              itemDiscountType: "none" as const,
              itemDiscountValue: 0,
            },
          ],
        };
      });
      return { tabs };
    }),
  removeItem: (tabId, itemIndex) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, items: tab.items.filter((_, index) => index !== itemIndex) } : tab
      ),
    })),
  updateItemDiscount: (tabId, itemIndex, type, value) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        return {
          ...tab,
          items: tab.items.map((item, index) => {
            if (index !== itemIndex) return item;
            return { ...item, itemDiscountType: type, itemDiscountValue: Math.max(0, Number(value || 0)) };
          }),
        };
      }),
    })),
  updateQuantity: (tabId, itemIndex, qty) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        return {
          ...tab,
          items: tab.items.map((item, index) => {
            if (index !== itemIndex) return item;
            const safeQty = Math.min(Math.max(1, qty), 1);
            return { ...item, quantity: safeQty };
          }),
        };
      }),
    })),
  setCustomer: (tabId, name, phone) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, customer: { name, phone } } : tab)),
    })),
  setSalesman: (tabId, salesmanId) =>
    set((state) => ({ tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, salesmanId } : tab)) })),
  setPaymentMethod: (tabId, method) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        const totalAmount = computeTotals(tab).totalAmount;
        if (method === "partial") {
          const hasBreakdown = Array.isArray(tab.paymentBreakdown) && tab.paymentBreakdown.length > 0;
          return {
            ...tab,
            paymentMethod: method,
            paymentBreakdown: hasBreakdown ? tab.paymentBreakdown : [{ method: "cash", amount: totalAmount }],
          };
        }
        return { ...tab, paymentMethod: method, paymentBreakdown: [] };
      }),
    })),
  addPaymentSplit: (tabId, method, amount) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        if (tab.paymentMethod !== "partial") return tab;
        if (tab.paymentBreakdown.some((entry) => entry.method === method)) return tab;
        return {
          ...tab,
          paymentBreakdown: [...tab.paymentBreakdown, { method, amount: Math.max(0, Number(amount || 0)) }],
        };
      }),
    })),
  removePaymentSplit: (tabId, index) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        if (tab.paymentMethod !== "partial") return tab;
        return {
          ...tab,
          paymentBreakdown: tab.paymentBreakdown.filter((_, entryIndex) => entryIndex !== index),
        };
      }),
    })),
  updatePaymentSplit: (tabId, index, amount) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        if (tab.paymentMethod !== "partial") return tab;
        return {
          ...tab,
          paymentBreakdown: tab.paymentBreakdown.map((entry, entryIndex) =>
            entryIndex === index ? { ...entry, amount: Math.max(0, Number(amount || 0)) } : entry
          ),
        };
      }),
    })),
  setBillDiscount: (tabId, type, value) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, billDiscountType: type, billDiscountValue: Math.max(0, Number(value || 0)) } : tab
      ),
    })),
  setCashReceived: (tabId, amount) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, cashReceived: Math.max(0, Number(amount || 0)) } : tab)),
    })),
  holdBill: async (tabId) => {
    const tab = get().tabs.find((value) => value.id === tabId);
    if (!tab) return null;
    const totals = computeTotals(tab);
    const payload = {
      customer: tab.customer,
      salesman: tab.salesmanId || undefined,
      paymentMethod: tab.paymentMethod,
      paymentBreakdown: tab.paymentBreakdown,
      items: tab.items,
      billDiscountType: tab.billDiscountType,
      billDiscountValue: tab.billDiscountValue,
      cashReceived: tab.cashReceived,
      ...totals,
    };
    const held = await billingApi.holdBill(payload);
    set((state) => {
      const tabs = state.tabs.filter((item) => item.id !== tabId);
      if (tabs.length === 0) {
        const next = makeTab();
        return { tabs: [next], activeTabId: next.id, heldBills: [held, ...state.heldBills] };
      }
      return { tabs, activeTabId: tabs[0].id, heldBills: [held, ...state.heldBills] };
    });
    return held;
  },
  resumeHeldBill: (bill) =>
    set((state) => {
      if (state.tabs.length >= 5) return state;
      const tab: BillTab = {
        id: crypto.randomUUID(),
        billNumber: bill.billNumber || null,
        customer: bill.customer || { name: "", phone: "" },
        salesmanId: bill.salesman || "",
        paymentMethod: bill.paymentMethod || "cash",
        paymentBreakdown: Array.isArray(bill.paymentBreakdown)
          ? bill.paymentBreakdown
          : [
              ...(Number(bill.splitPayment?.cash || 0) > 0 ? [{ method: "cash" as const, amount: Number(bill.splitPayment.cash || 0) }] : []),
              ...(Number(bill.splitPayment?.gpay || 0) > 0 ? [{ method: "gpay" as const, amount: Number(bill.splitPayment.gpay || 0) }] : []),
            ],
        items: (bill.items || []).map((item: any) => ({
          product: item.product,
          barcode: item.barcode,
          name: item.name,
          category: item.category,
          size: item.size,
          mrp: Number(item.mrp || 0),
          stock: 999,
          quantity: Number(item.quantity || 1),
          itemDiscountType: item.itemDiscountType || "none",
          itemDiscountValue: Number(item.itemDiscountValue || 0),
        })),
        billDiscountType: bill.billDiscountType || "none",
        billDiscountValue: Number(bill.billDiscountValue || 0),
        cashReceived: Number(bill.cashReceived || 0),
        status: "active",
        createdAt: new Date().toISOString(),
      };
      return { tabs: [...state.tabs, tab], activeTabId: tab.id, heldBills: state.heldBills.filter((h: any) => h._id !== bill._id) };
    }),
  clearTab: (tabId) =>
    set((state) => ({ tabs: state.tabs.map((tab) => (tab.id === tabId ? makeTab() : tab)) })),
  fetchHeldBills: async () => {
    const heldBills = await billingApi.getHeldBills();
    set({ heldBills });
  },
  discardHeldBill: async (id: string) => {
    await billingApi.discardHeldBill(id);
    set((state) => ({ heldBills: state.heldBills.filter((bill: any) => bill._id !== id) }));
  },
  computedTotals: (tabId) => computeTotals(get().tabs.find((tab) => tab.id === tabId)),
  totalPaid: (tabId) => {
    const tab = get().tabs.find((entry) => entry.id === tabId);
    if (!tab) return 0;
    return (tab.paymentBreakdown || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  },
  remainingAmount: (tabId) => {
    const tab = get().tabs.find((entry) => entry.id === tabId);
    if (!tab) return 0;
    const totals = computeTotals(tab);
    const paid = (tab.paymentBreakdown || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    return totals.totalAmount - paid;
  },
}));
