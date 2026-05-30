"use client";

import { useEffect, useRef, useState } from "react";
import { CustomerSearchResult, searchCustomers } from "@/lib/api";

type ActiveField = "name" | "phone";

function minQueryLength(field: ActiveField, query: string) {
  const digitsOnly = query.replace(/\D/g, "");
  if (field === "phone" || digitsOnly.length >= query.trim().length) {
    return 3;
  }
  return 2;
}

function formatLastVisit(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CustomerSearchFields({
  name,
  phone,
  onChange,
}: {
  name: string;
  phone: string;
  onChange: (name: string, phone: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<number | null>(null);
  const searchSeq = useRef(0);
  const skipSearch = useRef(false);

  const [activeField, setActiveField] = useState<ActiveField>("name");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const query = (activeField === "name" ? name : phone).trim();
  const canSearch = query.length >= minQueryLength(activeField, query);

  const closeDropdown = () => {
    setOpen(false);
    setSelectedIndex(0);
  };

  const selectCustomer = (customer: CustomerSearchResult) => {
    skipSearch.current = true;
    onChange(customer.name || "", customer.phone || "");
    closeDropdown();
    setResults([]);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        closeDropdown();
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      closeDropdown();
      return;
    }

    if (!canSearch) {
      setLoading(false);
      setResults([]);
      closeDropdown();
      return;
    }

    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(async () => {
      const mySeq = ++searchSeq.current;
      setLoading(true);
      setOpen(true);
      try {
        const data = await searchCustomers(query);
        if (mySeq !== searchSeq.current) return;
        setResults(data);
        setSelectedIndex(0);
      } catch {
        if (mySeq !== searchSeq.current) return;
        setResults([]);
      } finally {
        if (mySeq === searchSeq.current) setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [query, canSearch, activeField]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      return;
    }

    if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const max = results.length;
      if (max <= 0) return;
      setSelectedIndex((idx) => {
        const next = e.key === "ArrowDown" ? idx + 1 : idx - 1;
        if (next < 0) return max - 1;
        if (next >= max) return 0;
        return next;
      });
      return;
    }

    if (e.key === "Enter" && open && results.length > 0) {
      e.preventDefault();
      selectCustomer(results[Math.min(selectedIndex, results.length - 1)]);
    }
  };

  const showDropdown = open && canSearch;
  const showNoResults = showDropdown && !loading && results.length === 0;

  return (
    <div ref={wrapperRef} className="space-y-2 relative">
      <input
        className="pos-input w-full"
        placeholder="Customer name"
        value={name}
        onChange={(e) => onChange(e.target.value, phone)}
        onFocus={() => {
          setActiveField("name");
          if (name.trim().length >= minQueryLength("name", name)) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      <input
        className="pos-input w-full"
        placeholder="Mobile number"
        inputMode="numeric"
        value={phone}
        onChange={(e) => onChange(name, e.target.value.replace(/[^\d]/g, ""))}
        onFocus={() => {
          setActiveField("phone");
          if (phone.trim().length >= minQueryLength("phone", phone)) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />

      {showDropdown ? (
        <div
          className="absolute left-0 right-0 z-50 top-full mt-1 bg-[#222636] border border-[var(--border)] rounded-lg max-h-[240px] overflow-y-auto shadow-lg"
          role="listbox"
          aria-label="Customer search results"
        >
          {loading ? (
            <div className="py-3 text-center text-sm text-[var(--text-secondary)] flex items-center justify-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-[var(--text-secondary)] border-t-transparent animate-spin" />
              <span>Searching...</span>
            </div>
          ) : null}

          {!loading && results.length > 0
            ? results.map((customer, idx) => {
                const isSelected = idx === selectedIndex;
                const visits = Number(customer.totalBills || 0);
                const lastVisit = formatLastVisit(customer.lastVisit);
                return (
                  <div
                    key={`${customer.phone}-${idx}`}
                    className={[
                      "px-3 py-2 cursor-pointer border-l-2",
                      isSelected
                        ? "bg-[color-mix(in_srgb,var(--gold)_20%,transparent)] border-l-[var(--gold)]"
                        : "border-l-transparent hover:bg-[var(--surface)]",
                    ].join(" ")}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectCustomer(customer)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{customer.name}</div>
                        <div className="text-xs text-[var(--text-secondary)] mt-0.5">{customer.phone}</div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-[var(--text-secondary)]">
                        {visits > 0 ? <div>{visits} bill{visits === 1 ? "" : "s"}</div> : null}
                        {lastVisit ? <div>Last: {lastVisit}</div> : null}
                        {typeof customer.pointsBalance === "number" ? (
                          <div className="text-[var(--gold)]">{customer.pointsBalance} pts</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            : null}

          {showNoResults ? (
            <div className="py-3 text-center text-sm text-[var(--text-secondary)]">No customers found</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
