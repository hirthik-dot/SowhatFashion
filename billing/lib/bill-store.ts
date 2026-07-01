"use client";

import { create } from "zustand";
import { billingApi } from "@/lib/api";
import { calcPointsDiscountRupees, type PointsMode } from "@/lib/points";
import { computeBillTotals as computeBillTotalsCore } from "@/lib/billing-totals";

export type PaymentMethod = "cash" | "gpay" | "upi" | "card" | "partial" | "pending";
export type PaymentSplitMethod = "cash" | "gpay" | "upi" | "card";
export type DiscountType = "percent" | "amount" | "none";

export type BillItem = {
  product: string;
  productId?: string;
  stockItemId?: string;
  barcode: string;
  barcodes: string[];
  name: string;
  category?: string;
  size?: string;
  mrp: number;
  stock?: number;
  quantity: number;
  itemDiscountType: DiscountType;
  itemDiscountValue: number;
};

export type AddItemResult = { added: boolean; message?: string };

const lineKey = (productId: string, size?: string, mrp?: number) =>
  `${productId}|${size || ""}|${mrp ?? ""}`;

const itemBarcodes = (item: BillItem) => (item.barcodes?.length ? item.barcodes : item.barcode ? [item.barcode] : []);

const tabBarcodes = (items: BillItem[]) => items.flatMap((item) => itemBarcodes(item));

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
  pointsMode: PointsMode;
  awardPoints: boolean;
  pointsToRedeem: number;
  completeWithPending: boolean;
  status: "active" | "held";
  createdAt: string;
};

export type BillTotals = {
  subtotal: number;
  totalItemDiscount: number;
  afterItemDiscount: number;
  billDiscountAmount: number;
  grossWithGst: number;
  netInclusive: number;
  taxableAmount: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  roundOff: number;
  prePointsTotalAmount: number;
  pointsDiscountAmount: number;
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
  addItem: (tabId: string, product: any) => AddItemResult;
  removeItem: (tabId: string, itemIndex: number) => void;
  updateItemDiscount: (tabId: string, itemIndex: number, type: "percent" | "amount", value: number) => void;
  incrementItemQuantity: (tabId: string, itemIndex: number) => Promise<AddItemResult>;
  decrementItemQuantity: (tabId: string, itemIndex: number) => void;
  getTabBarcodes: (tabId: string) => string[];
  setCustomer: (tabId: string, name: string, phone: string) => void;
  setSalesman: (tabId: string, salesmanId: string) => void;
  setPaymentMethod: (tabId: string, method: PaymentMethod) => void;
  addPaymentSplit: (tabId: string, method: PaymentSplitMethod, amount: number) => void;
  removePaymentSplit: (tabId: string, index: number) => void;
  updatePaymentSplit: (tabId: string, index: number, amount: number) => void;
  updatePaymentSplitMethod: (tabId: string, index: number, method: PaymentSplitMethod) => void;
  setBillDiscount: (tabId: string, type: DiscountType, value: number) => void;
  setCashReceived: (tabId: string, amount: number) => void;
  setPointsMode: (tabId: string, mode: PointsMode) => void;
  setAwardPoints: (tabId: string, award: boolean) => void;
  setPointsToRedeem: (tabId: string, points: number) => void;
  setCompleteWithPending: (tabId: string, value: boolean) => void;
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
  billDiscountType: "amount",
  billDiscountValue: 0,
  cashReceived: 0,
  pointsMode: "earn",
  awardPoints: true,
  pointsToRedeem: 0,
  completeWithPending: false,
  status: "active",
  createdAt: new Date().toISOString(),
});

const computeTotals = (tab?: BillTab): BillTotals => {
  const items = tab?.items || [];
  const pointsRedeemed =
    tab?.pointsMode === "redeem" ? Math.floor(Math.max(0, Number(tab.pointsToRedeem || 0))) : 0;
  const pointsDiscountInput =
    pointsRedeemed > 0 ? calcPointsDiscountRupees(pointsRedeemed) : 0;
  const core = computeBillTotalsCore(
    items,
    tab?.billDiscountType || "none",
    Number(tab?.billDiscountValue || 0),
    pointsDiscountInput
  );
  const {
    subtotal,
    totalItemDiscount,
    afterItemDiscount,
    billDiscountAmount,
    grossWithGst,
    netInclusive,
    taxableAmount,
    gstAmount,
    cgst,
    sgst,
    roundOff,
    prePointsTotalAmount,
    pointsDiscountAmount,
    totalAmount,
  } = core;
  const cashPortion =
    tab?.paymentMethod === "partial"
      ? (tab.paymentBreakdown || [])
          .filter((entry) => entry.method === "cash")
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
      : tab?.paymentMethod === "cash"
      ? totalAmount
      : 0;
  const changeReturned = Math.max(0, Number(tab?.cashReceived || 0) - cashPortion);
  return {
    subtotal,
    totalItemDiscount,
    afterItemDiscount,
    billDiscountAmount,
    grossWithGst,
    netInclusive,
    taxableAmount,
    gstAmount,
    cgst,
    sgst,
    roundOff,
    prePointsTotalAmount,
    pointsDiscountAmount,
    totalAmount,
    changeReturned,
  };
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
  getTabBarcodes: (tabId) => {
    const tab = get().tabs.find((entry) => entry.id === tabId);
    return tab ? tabBarcodes(tab.items) : [];
  },
  addItem: (tabId, product) => {
    const barcode = String(product.barcode || "").trim();
    if (!barcode) return { added: false, message: "Product has no barcode" };

    const productId = String(product.productId || product._id || "");
    const size = String(product.size || "");
    let result: AddItemResult = { added: false, message: "Bill tab not found" };

    set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        const used = new Set(tabBarcodes(tab.items));
        if (used.has(barcode)) {
          result = { added: false, message: "This barcode is already on the bill" };
          return tab;
        }

        const mrp = Number(product.mrp || product.price || 0);
        const key = lineKey(productId, size, mrp);
        const existingIndex = tab.items.findIndex(
          (item) =>
            lineKey(String(item.productId || item.product), item.size, item.mrp) === key
        );

        if (existingIndex >= 0) {
          const existing = tab.items[existingIndex];
          const stockLimit = Number(existing.stock || product.stock || 0);
          if (stockLimit > 0 && existing.quantity >= stockLimit) {
            result = { added: false, message: "No more stock available" };
            return tab;
          }
          const items = tab.items.map((item, index) => {
            if (index !== existingIndex) return item;
            const barcodes = [...itemBarcodes(item), barcode];
            return { ...item, barcodes, barcode: barcodes[0], quantity: barcodes.length };
          });
          result = { added: true };
          return { ...tab, items };
        }

        const stockLimit = Number(product.stock || 0);
        if (stockLimit <= 0) {
          result = { added: false, message: "No more stock available" };
          return tab;
        }

        result = { added: true };
        return {
          ...tab,
          items: [
            ...tab.items,
            {
              product: productId,
              productId,
              stockItemId: product.stockItemId,
              barcode,
              barcodes: [barcode],
              name: product.name,
              category: product.category || "",
              size,
              mrp,
              stock: stockLimit,
              quantity: 1,
              itemDiscountType: "amount" as const,
              itemDiscountValue: 0,
            },
          ],
        };
      });
      return { tabs };
    });

    return result;
  },
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
  incrementItemQuantity: async (tabId, itemIndex) => {
    const tab = get().tabs.find((entry) => entry.id === tabId);
    const item = tab?.items[itemIndex];
    if (!item) return { added: false, message: "Item not found" };

    const stockLimit = Number(item.stock || 0);
    if (stockLimit > 0 && item.quantity >= stockLimit) {
      return { added: false, message: "No more stock available" };
    }

    const exclude = tabBarcodes(tab.items);
    try {
      const next = await billingApi.nextBarcode(
        String(item.productId || item.product),
        item.size || "",
        exclude,
        item.mrp
      );
      const barcode = String(next.barcode || "").trim();
      if (!barcode) return { added: false, message: "No barcode returned" };

      set((state) => ({
        tabs: state.tabs.map((entry) => {
          if (entry.id !== tabId) return entry;
          return {
            ...entry,
            items: entry.items.map((row, index) => {
              if (index !== itemIndex) return row;
              const barcodes = [...itemBarcodes(row), barcode];
              return { ...row, barcodes, barcode: barcodes[0], quantity: barcodes.length };
            }),
          };
        }),
      }));
      return { added: true };
    } catch (error: any) {
      return { added: false, message: error?.message || "No more stock available" };
    }
  },
  decrementItemQuantity: (tabId, itemIndex) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        const items = tab.items.flatMap((item, index) => {
          if (index !== itemIndex) return [item];
          const barcodes = [...itemBarcodes(item)];
          if (barcodes.length <= 1) return [];
          barcodes.pop();
          return [{ ...item, barcodes, barcode: barcodes[0], quantity: barcodes.length }];
        });
        return { ...tab, items };
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
            completeWithPending: false,
            paymentBreakdown: hasBreakdown ? tab.paymentBreakdown : [{ method: "cash", amount: totalAmount }],
          };
        }
        if (method === "pending") {
          return { ...tab, paymentMethod: method, paymentBreakdown: [], completeWithPending: true };
        }
        return { ...tab, paymentMethod: method, paymentBreakdown: [], completeWithPending: false };
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
  updatePaymentSplitMethod: (tabId, index, method) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        if (tab.paymentMethod !== "partial") return tab;
        if (tab.paymentBreakdown.some((entry, entryIndex) => entryIndex !== index && entry.method === method)) {
          return tab;
        }
        return {
          ...tab,
          paymentBreakdown: tab.paymentBreakdown.map((entry, entryIndex) =>
            entryIndex === index ? { ...entry, method } : entry
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
  setPointsMode: (tabId, mode) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              pointsMode: mode,
              pointsToRedeem: mode === "earn" ? 0 : tab.pointsToRedeem,
              awardPoints: mode === "earn" ? tab.awardPoints : false,
            }
          : tab
      ),
    })),
  setAwardPoints: (tabId, award) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, awardPoints: award } : tab)),
    })),
  setPointsToRedeem: (tabId, points) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, pointsToRedeem: Math.max(0, Math.floor(Number(points || 0))) } : tab
      ),
    })),
  setCompleteWithPending: (tabId, value) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, completeWithPending: value } : tab)),
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
      pointsMode: tab.pointsMode,
      awardPoints: tab.awardPoints,
      pointsToRedeem: tab.pointsToRedeem,
      completeWithPending: tab.completeWithPending,
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
        items: (bill.items || []).map((item: any) => {
          const barcodes =
            Array.isArray(item.barcodes) && item.barcodes.length > 0
              ? item.barcodes.map((code: string) => String(code).trim()).filter(Boolean)
              : item.barcode
              ? [String(item.barcode).trim()]
              : [];
          const quantity = Math.max(1, Number(item.quantity || barcodes.length || 1));
          return {
            product: item.product,
            productId: item.productId || item.product,
            barcode: barcodes[0] || String(item.barcode || ""),
            barcodes: barcodes.length ? barcodes : [String(item.barcode || "")].filter(Boolean),
            name: item.name,
            category: item.category,
            size: item.size,
            mrp: Number(item.mrp || 0),
            stock: quantity,
            quantity,
            itemDiscountType: item.itemDiscountType || "none",
            itemDiscountValue: Number(item.itemDiscountValue || 0),
          };
        }),
        billDiscountType: bill.billDiscountType || "none",
        billDiscountValue: Number(bill.billDiscountValue || 0),
        cashReceived: Number(bill.cashReceived || 0),
        pointsMode: bill.pointsMode === "redeem" ? "redeem" : "earn",
        awardPoints: bill.awardPoints !== false,
        pointsToRedeem: Number(bill.pointsRedeemed || bill.pointsToRedeem || 0),
        completeWithPending: bill.paymentMethod === "pending" || Number(bill.pendingAmount || 0) > 0,
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
