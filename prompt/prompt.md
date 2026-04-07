We are working inside an existing monorepo at the root level.
The folder structure is:
- /frontend → existing website (Next.js) — DO NOT TOUCH
- /backend → existing Express + Node.js server
- /billing → CREATE THIS (new Next.js 14 billing PWA)

All new backend routes go inside /backend/src/routes/ 
as new files prefixed with "billing-"
Mount them in existing /backend/src/server.ts under /api/billing/*
Do not break any existing routes or models.
Only ADD new files. Only ADD new fields to existing models where needed.

---

## WHAT WE ARE BUILDING

A full POS (Point of Sale) billing system for Sowaat Mens Wear.
It shares the same MongoDB Atlas database as the website so that
inventory is always in sync — online sales and in-store sales
both decrement the same stock field on the Product model.

---

## TECH STACK

Billing Frontend (/billing):
- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- Zustand (bill state + auth)
- Recharts (dashboard charts)
- react-barcode (barcode generation)
- @dnd-kit/core (drag reorder where needed)
- react-to-print (receipt + label printing)
- xlsx (Excel export)
- PWA: next-pwa (installable, works on tablet)

Backend additions (/backend):
- New routes in /backend/src/routes/
- New models in /backend/src/models/
- Mounted under /api/billing/* in server.ts

---

## COLOR SYSTEM (billing app)

Professional dark-mode POS feel:

--bg: #0F1117
--surface: #1A1D27
--surface-2: #222636
--border: #2E3347
--gold: #C9A84C
--gold-hover: #A8882E
--text-primary: #F5F5F5
--text-secondary: #9CA3AF
--success: #22C55E
--error: #EF4444
--warning: #F59E0B
--info: #3B82F6

Font: Inter (clean, readable, professional POS feel)

---

## FOLDER STRUCTURE — /billing
/billing
/app
/page.tsx                    → redirect to /dashboard or /login
/login/page.tsx
/dashboard/page.tsx
/billing/page.tsx            → main billing screen
/stock/page.tsx              → stock entry
/stock/barcodes/page.tsx     → barcode print screen
/returns/page.tsx            → return/replacement
/reports/page.tsx            → reports + charts
/admin/page.tsx              → admin management
/admin/suppliers/page.tsx
/admin/categories/page.tsx
/admin/salesmen/page.tsx
/admin/staff/page.tsx
/components
/layout
Sidebar.tsx
TopBar.tsx
MobileSidebar.tsx
/billing
BillTab.tsx
BillItemRow.tsx
BarcodeScanner.tsx
DiscountInput.tsx
PaymentSummary.tsx
HeldBillsDrawer.tsx
ReceiptPrint.tsx
/stock
StockEntryForm.tsx
BarcodeLabel.tsx
BarcodePrintSheet.tsx
/returns
ReturnFlow.tsx
/reports
RevenueChart.tsx
PaymentDonut.tsx
CategoryPie.tsx
SalesmanTable.tsx
BillsTable.tsx
/dashboard
StatCard.tsx
RecentBills.tsx
LowStockAlert.tsx
/shared
ConfirmDialog.tsx
DataTable.tsx
ExportButton.tsx
/lib
api.ts                       → all API call functions
auth-store.ts                → Zustand auth
bill-store.ts                → Zustand multi-tab bill state
print-utils.ts               → print helpers
barcode-utils.ts             → barcode generation
excel-utils.ts               → Excel export
/hooks
useBarcodeScanner.ts         → barcode scanner input detection
useReports.ts
next.config.js                 → PWA config
manifest.json                  → PWA manifest

---

## BACKEND — NEW MODELS

Create these in /backend/src/models/

### /backend/src/models/Supplier.ts
```typescript
{
  name: string (required),
  phone: string,
  address: string,
  gstNumber: string,
  isActive: boolean (default true),
  createdAt: Date
}
```

### /backend/src/models/BillingCategory.ts
```typescript
{
  name: string (required),
  slug: string (unique, auto from name),
  parentCategory: ObjectId | null,  // null = main category
  supplier: ObjectId (ref Supplier),
  isActive: boolean (default true),
  order: number
}
// parentCategory null = "T-Shirts"
// parentCategory set = "T-Shirt Sleeveless" (subcategory)
```

### /backend/src/models/StockEntry.ts
```typescript
{
  supplier: ObjectId (ref Supplier, required),
  category: ObjectId (ref BillingCategory, required),
  subCategory: ObjectId (ref BillingCategory, required),
  quantity: number (required),
  incomingPrice: number (required),  // cost price
  sellingPrice: number (required),   // MRP
  size: string,
  gstPercent: number (default 5),
  barcodes: [string],                // array of generated barcodes
  productIds: [ObjectId],            // created Product refs
  entryDate: Date (default now),
  enteredBy: ObjectId (ref BillingAdmin),
  notes: string
}
```

### /backend/src/models/Salesman.ts
```typescript
{
  name: string (required),
  phone: string,
  isActive: boolean (default true),
  createdAt: Date
}
```

### /backend/src/models/Bill.ts
```typescript
{
  billNumber: string (unique),    // SW-2025-0001
  customer: {
    name: string,
    phone: string
  },
  salesman: ObjectId (ref Salesman),
  items: [{
    product: ObjectId (ref Product),
    barcode: string,
    name: string,
    category: string,
    size: string,
    mrp: number,
    itemDiscountType: {
      type: String,
      enum: ['percent', 'amount', 'none'],
      default: 'none'
    },
    itemDiscountValue: number (default 0),
    itemDiscountAmount: number (default 0),
    sellingPrice: number,          // mrp - item discount
    quantity: number (default 1),
    gstPercent: number (default 5),
    lineTotal: number              // sellingPrice * quantity
  }],
  subtotal: number,                // sum of lineTotals
  totalItemDiscount: number,
  billDiscountType: {
    type: String,
    enum: ['percent', 'amount', 'none'],
    default: 'none'
  },
  billDiscountValue: number (default 0),
  billDiscountAmount: number (default 0),
  taxableAmount: number,           // subtotal - all discounts
  gstAmount: number,               // 5% on taxableAmount
  roundOff: number,                // rounding adjustment
  totalAmount: number,             // final rounded total
  paymentMethod: {
    type: String,
    enum: ['cash', 'gpay', 'upi', 'card', 'split']
  },
  splitPayment: {
    cash: number,
    gpay: number
  },
  cashReceived: number,            // for change calculation
  changeReturned: number,
  status: {
    type: String,
    enum: ['draft', 'held', 'completed', 'returned', 'partial_return'],
    default: 'draft'
  },
  createdBy: ObjectId (ref BillingAdmin),
  createdAt: Date,
  completedAt: Date
}
```

### /backend/src/models/Return.ts
```typescript
{
  bill: ObjectId (ref Bill),
  billNumber: string,
  returnNumber: string,            // SW-RET-2025-0001
  customer: {
    name: string,
    phone: string
  },
  returnedItems: [{
    product: ObjectId,
    barcode: string,
    name: string,
    size: string,
    quantity: number,
    sellingPrice: number,
    reason: string
  }],
  replacementItems: [{
    product: ObjectId,
    barcode: string,
    name: string,
    size: string,
    quantity: number,
    sellingPrice: number
  }],
  returnType: {
    type: String,
    enum: ['refund', 'replacement', 'partial']
  },
  priceDifference: number,         // replacement - returned
  refundAmount: number,
  refundMethod: {
    type: String,
    enum: ['cash', 'gpay', 'none']
  },
  processedBy: ObjectId (ref BillingAdmin),
  createdAt: Date
}
```

### /backend/src/models/BillingAdmin.ts
```typescript
{
  name: string (required),
  email: string (unique, required),
  password: string,                // bcrypt hashed
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'cashier'],
    default: 'cashier'
  },
  createdBy: ObjectId (ref BillingAdmin),
  permissions: {
    canBill: boolean (default true),
    canReturn: boolean (default false),
    canManageStock: boolean (default false),
    canViewReports: boolean (default false),
    canManageAdmins: boolean (default false),
    canDiscount: boolean (default true),
    maxDiscountPercent: number (default 5)
  },
  isActive: boolean (default true),
  lastLogin: Date,
  createdAt: Date
}
```

### Update existing /backend/src/models/Product.ts
ADD these fields to existing Product model:
```typescript
barcode: string (unique, sparse),   // sparse = allows null
sku: string,
incomingPrice: number,
supplier: ObjectId (ref Supplier),
subCategory: ObjectId (ref BillingCategory),
```

---

## BACKEND — NEW ROUTES

Create these files in /backend/src/routes/

### billing-auth.ts → /api/billing/auth
POST /login
- Find BillingAdmin by email
- bcrypt compare password
- Return JWT in httpOnly cookie named 'billing_token'
- Update lastLogin
- Return admin data + permissions

POST /logout
- Clear billing_token cookie

GET /me
- Verify billing_token
- Return admin data

### billing-suppliers.ts → /api/billing/suppliers
GET / → all active suppliers
POST / → create supplier (admin+)
PUT /:id → update supplier
DELETE /:id → soft delete (isActive: false)

### billing-categories.ts → /api/billing/categories
GET / → all categories with subcategories nested
GET /flat → flat list for dropdowns
GET /:id/subcategories → subcategories of a category
POST / → create category or subcategory
PUT /:id → update
DELETE /:id → soft delete

### billing-stock.ts → /api/billing/stock
POST /entry → create stock entry:
  1. Validate supplier + category + subCategory exist
  2. Generate `quantity` number of unique barcodes:
     Format: SW + YYYYMMDD + 4-digit-increment
     Check each against Product.barcode for uniqueness
  3. Create `quantity` Product documents with:
     - barcode (unique)
     - name from subCategory
     - category from BillingCategory
     - price = sellingPrice
     - incomingPrice
     - supplier ref
     - size
     - stock: 1 (each product = 1 unit with unique barcode)
     - isActive: true
  4. Create StockEntry document
  5. Return StockEntry with barcodes array

GET /entries → paginated stock entry history
GET /entries/:id → single entry with barcodes
GET /low-stock → products where stock <= 2

### billing-bills.ts → /api/billing/bills
GET /scan/:barcode → find product by barcode
  Returns: product name, size, mrp, stock status
  Error if barcode not found or out of stock

POST /calculate → calculate bill totals (no DB write)
  Body: { items, billDiscountType, billDiscountValue }
  Returns: { subtotal, itemDiscounts, billDiscount, 
             taxableAmount, gst, roundOff, total }
  
  Calculation logic:
subtotal = sum(item.sellingPrice * item.quantity)
totalItemDiscount = sum(item.itemDiscountAmount * item.quantity)
afterItemDiscount = subtotal - totalItemDiscount
if billDiscountType === 'percent':
billDiscountAmount = afterItemDiscount * (billDiscountValue/100)
else if billDiscountType === 'amount':
billDiscountAmount = billDiscountValue
else:
billDiscountAmount = 0
taxableAmount = afterItemDiscount - billDiscountAmount
gstAmount = taxableAmount * 0.05
rawTotal = taxableAmount + gstAmount
roundOff = Math.round(rawTotal) - rawTotal
totalAmount = Math.round(rawTotal)

POST /hold → save bill as held (status: 'held'), no stock deduction
GET /held → all held bills for today
DELETE /held/:id → discard held bill

POST /complete → complete bill:
  1. Calculate final totals (server-side, never trust client)
  2. Generate billNumber: SW-YYYY-XXXX (auto increment)
  3. Deduct stock for each item:
     product.stock -= item.quantity
     if product.stock <= 0: product.isActive = false
  4. Save Bill with status: 'completed'
  5. Trigger revalidateFrontend for website ISR
  6. Return complete bill with billNumber

GET / → paginated bills list (admin)
GET /:id → single bill details
GET /number/:billNumber → find by bill number

### billing-returns.ts → /api/billing/returns
GET /scan/:barcode → find which bill this barcode was sold in
POST / → process return:
  1. Find original bill
  2. For returned items: product.stock += quantity
  3. For replacement items: product.stock -= quantity
  4. Generate returnNumber: SW-RET-YYYY-XXXX
  5. Update original bill status
  6. Save Return document
  7. Trigger frontend revalidation
GET / → paginated returns list
GET /:id → single return

### billing-reports.ts → /api/billing/reports
GET /summary → 
  Query params: startDate, endDate
  Returns: {
    totalRevenue, totalBills, totalItems,
    totalReturns, totalDiscount, totalGst,
    avgBillValue, topProducts[], 
    salesmanPerformance[],
    paymentMethodBreakdown {},
    categoryBreakdown {},
    hourlyRevenue [] (for daily),
    dailyRevenue [] (for weekly/monthly)
  }

GET /bills → paginated bills for reports table
GET /export → 
  Returns Excel file (use exceljs):
  Sheet 1: Bills summary
  Sheet 2: Item-wise breakdown
  Sheet 3: Salesman performance
  Sheet 4: Category breakdown

### billing-admin.ts → /api/billing/admin
GET /admins → all billing admins
POST /admins → create new admin (any admin can create)
PUT /admins/:id → update admin
DELETE /admins/:id → deactivate
GET /salesmen → all salesmen
POST /salesmen → create salesman
PUT /salesmen/:id → update
DELETE /salesmen/:id → deactivate

### Mount in server.ts
Add these lines (do not remove anything existing):
```typescript
import billingAuthRoutes from './routes/billing-auth'
import billingSuppliersRoutes from './routes/billing-suppliers'
import billingCategoriesRoutes from './routes/billing-categories'
import billingStockRoutes from './routes/billing-stock'
import billingBillsRoutes from './routes/billing-bills'
import billingReturnsRoutes from './routes/billing-returns'
import billingReportsRoutes from './routes/billing-reports'
import billingAdminRoutes from './routes/billing-admin'

app.use('/api/billing/auth', billingAuthRoutes)
app.use('/api/billing/suppliers', billingAuthMiddleware, billingSuppliersRoutes)
app.use('/api/billing/categories', billingAuthMiddleware, billingCategoriesRoutes)
app.use('/api/billing/stock', billingAuthMiddleware, billingStockRoutes)
app.use('/api/billing/bills', billingAuthMiddleware, billingBillsRoutes)
app.use('/api/billing/returns', billingAuthMiddleware, billingReturnsRoutes)
app.use('/api/billing/reports', billingAuthMiddleware, billingReportsRoutes)
app.use('/api/billing/admin', billingAuthMiddleware, billingAdminRoutes)
```

Create billingAuthMiddleware separately — uses 'billing_token' cookie
(different from website 'admin_token' cookie)

---

## BILLING FRONTEND — BUILD COMPLETELY

### PWA Setup (next.config.js)
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})

module.exports = withPWA({
  // config
})
```

manifest.json:
```json
{
  "name": "Sowaat POS",
  "short_name": "Sowaat POS",
  "description": "Sowaat Mens Wear Point of Sale",
  "theme_color": "#0F1117",
  "background_color": "#0F1117",
  "display": "standalone",
  "orientation": "landscape",
  "start_url": "/billing",
  "icons": [...]
}
```

---

### LOGIN PAGE (/login)

Clean centered card on dark bg:
┌────────────────────────────────┐
│                                │
│  [SW] SOWAAT POS               │
│  Point of Sale System          │
│                                │
│  Email     []  │
│  Password  []  │
│                                │
│  [       SIGN IN        ]      │
│                                │
└────────────────────────────────┘

- Dark bg (#0F1117)
- Card: #1A1D27, rounded-xl, border border-[--border]
- Logo: dark square with "SW" gold text
- Input: dark bg #222636, border --border, 
  focus border --gold, text white, 48px height
- Button: bg --gold, text black, font-bold, full width, 48px
- Error: red text below button
- On success: redirect to /dashboard

---

### LAYOUT — SIDEBAR + TOPBAR

Sidebar (desktop, fixed left, 220px wide):
┌────────────────────┐
│ [SW] SOWAAT POS    │
├────────────────────┤
│ 📊 Dashboard       │
│ 🧾 Billing         │ ← highlighted gold when active
│ 📦 Stock Entry     │
│ ↩  Returns         │
│ 📈 Reports         │
├────────────────────┤
│ ⚙  Admin          │
│    Suppliers       │
│    Categories      │
│    Salesmen        │
│    Staff           │
├────────────────────┤
│ 👤 [Admin Name]    │
│    [Logout]        │
└────────────────────┘

- bg --surface (#1A1D27)
- Border-right --border
- Active link: bg --surface-2, border-l-2 border-[--gold], 
  text --gold
- Inactive: text --text-secondary, hover text white
- Logo area: border-bottom --border, py-4 px-4

TopBar (desktop, fixed top, height 56px):
[Page Title]                    [👤 Admin Name]  [🔔]
- bg --surface, border-bottom --border
- Right: admin name + role badge + notification bell

Mobile: hamburger menu, sidebar slides in as drawer

---

### DASHBOARD (/dashboard)
┌────────────────────────────────────────────────────────┐
│ Good morning, Karthik 👋    Today: Monday, 7 Apr 2025  │
├────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ Today's  │ │ Bills    │ │ Items    │ │ Low      │  │
│ │ Revenue  │ │ Today    │ │ Sold     │ │ Stock ⚠  │  │
│ │ ₹24,500  │ │    47    │ │   132   │ │    8     │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐ ┌────────────────────┐ │
│ │  Revenue - Last 7 Days      │ │  Payment Methods   │ │
│ │  [Bar Chart - Recharts]     │ │  [Donut Chart]     │ │
│ │                             │ │  Cash: 60%         │ │
│ │                             │ │  GPay: 35%         │ │
│ │                             │ │  Card: 5%          │ │
│ └─────────────────────────────┘ └────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐ ┌────────────────────┐ │
│ │  Top Categories Today       │ │  Recent Bills      │ │
│ │  [Pie Chart - Recharts]     │ │  SW-0047 ₹1,633    │ │
│ │                             │ │  SW-0046 ₹899      │ │
│ │                             │ │  SW-0045 ₹2,100    │ │
│ └─────────────────────────────┘ └────────────────────┘ │
│                                                        │
│ LOW STOCK ALERTS                                       │
│ ⚠ Blue Polo Shirt M → 1 left                          │
│ ⚠ Cargo Pants XL → 2 left                            │
└────────────────────────────────────────────────────────┘

Charts (Recharts):
- Revenue bar: gold bars (#C9A84C), dark grid lines
- Payment donut: gold/green/blue segments
- Category pie: multi-color segments
- All charts: dark background, white labels

Stat cards:
- bg --surface-2
- Border --border
- Value: white, 28px, font-bold
- Label: --text-secondary, text-sm
- Icon: colored icon top-right of card
- Low stock card: border-[--warning] when > 0 alerts

---

### BILLING PAGE (/billing) ← MOST CRITICAL

#### Multi-tab State (Zustand bill-store.ts)
```typescript
interface BillTab {
  id: string,                    // unique tab id
  billNumber: string | null,     // assigned on complete
  customer: { name: string, phone: string },
  salesmanId: string,
  paymentMethod: string,
  items: BillItem[],
  billDiscountType: 'percent' | 'amount' | 'none',
  billDiscountValue: number,
  cashReceived: number,
  status: 'active' | 'held',
  createdAt: Date
}

interface BillStore {
  tabs: BillTab[],
  activeTabId: string,
  
  createTab: () => void,          // creates new empty bill tab
  closeTab: (id: string) => void,
  setActiveTab: (id: string) => void,
  
  addItem: (tabId, product) => void,
  removeItem: (tabId, itemIndex) => void,
  updateItemDiscount: (tabId, itemIndex, type, value) => void,
  updateQuantity: (tabId, itemIndex, qty) => void,
  
  setCustomer: (tabId, name, phone) => void,
  setSalesman: (tabId, salesmanId) => void,
  setPaymentMethod: (tabId, method) => void,
  setBillDiscount: (tabId, type, value) => void,
  setCashReceived: (tabId, amount) => void,
  
  holdBill: (tabId) => void,      // saves to DB, removes tab
  resumeHeldBill: (bill) => void, // loads held bill into new tab
  clearTab: (tabId) => void,
  
  computedTotals: (tabId) => BillTotals  // derived calculation
}
```

#### Billing Page Layout
┌────────────────────────────────────────────────────────────┐
│ [Bill #1] [Bill #2] [+ New Bill]       [🗂 Held Bills (2)] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 🔍 [Scan barcode or type product name...      ] [+] │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                            │
│ ┌──────────────────────────────┐ ┌──────────────────────┐ │
│ │ BILL ITEMS                   │ │ CUSTOMER & PAYMENT   │ │
│ │                              │ │                      │ │
│ │ #  Item    MRP  Disc  Pr  Qty│ │ Name []  │ │
│ │ 1  Blue T  399  10%  359  1 ✕│ │ Phone[]  │ │
│ │ 2  Slim S  599   -   599  2 ✕│ │                      │ │
│ │                              │ │ Salesman [_______ ▾] │ │
│ │                              │ │ Payment  [Cash    ▾] │ │
│ │                              │ │                      │ │
│ │                              │ │ ─────────────────    │ │
│ │                              │ │ Subtotal    ₹1,557   │ │
│ │                              │ │ Item Disc   -₹40     │ │
│ │                              │ │ Bill Disc   [%▾][] │ │
│ │                              │ │ GST (5%)    +₹75     │ │
│ │                              │ │ Round Off   +₹0.45   │ │
│ │                              │ │ ─────────────────    │ │
│ │                              │ │ TOTAL       ₹1,633   │ │
│ │                              │ │                      │ │
│ │                              │ │ Cash [___] Chg ₹367│ │
│ │                              │ │                      │ │
│ │                              │ │ [HOLD] [COMPLETE 🖨] │ │
│ └──────────────────────────────┘ └──────────────────────┘ │
└────────────────────────────────────────────────────────────┘

#### Tab Bar
- Each tab: "Bill #1", "Bill #2" etc
- Active tab: bg --surface-2, border-top-2 --gold
- Inactive: bg --surface, text --text-secondary
- "+ New Bill" button: dashed border, text --gold
- Max 5 simultaneous tabs
- "Held Bills" button shows count badge

#### Barcode Scanner Input (BarcodeScanner.tsx + useBarcodeScanner.ts)
```typescript
// useBarcodeScanner.ts
// Barcode scanners type fast and end with Enter key
// Detect: if characters typed within 100ms + Enter = scanner
// Regular keyboard typing is slower

const useBarcodeScanner = (onScan: (barcode: string) => void) => {
  const buffer = useRef('')
  const lastKeyTime = useRef(0)
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      if (e.key === 'Enter' && buffer.current.length > 3) {
        onScan(buffer.current)
        buffer.current = ''
        return
      }
      if (now - lastKeyTime.current > 100) {
        buffer.current = ''  // reset if slow typing
      }
      if (e.key.length === 1) {
        buffer.current += e.key
      }
      lastKeyTime.current = now
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onScan])
}
```

On scan detected:
1. Call GET /api/billing/bills/scan/:barcode
2. If found: add item to active bill tab with success sound
3. If not found: shake animation + error sound + red flash
4. If out of stock: warning toast

Sound effects:
```typescript
// play beep on success
const successBeep = new Audio('/sounds/beep.mp3')
successBeep.play()

// play error on failure
const errorBeep = new Audio('/sounds/error.mp3')
errorBeep.play()
```

Add beep.mp3 and error.mp3 to /billing/public/sounds/

#### Bill Item Row (BillItemRow.tsx)
Each row in the bill:
| [img] Product Name (Size: M) | MRP: ₹399 | [%▾][___] disc | ₹359 | [-1+] | ₹359 | [✕]

Item discount:
- Toggle button: "%" or "₹" switches discount type
- Input: number input for discount value
- Real-time calculation: updates lineTotal immediately
- Max discount enforced: if cashier, max = permissions.maxDiscountPercent

Quantity:
- [-] [1] [+] stepper
- Min: 1, Max: available stock
- Cannot exceed stock

Remove: ✕ button removes item from bill

#### Payment Summary (right panel)
Subtotal:           ₹1,557
Item Discounts:     - ₹40
─────────
After Item Disc:    ₹1,517
Bill Discount:  [%▾][___]  - ₹0
─────────
Taxable Amount:     ₹1,517
GST (5%):           + ₹75.85
Round Off:          + ₹0.15
═════════
TOTAL:              ₹1,593
Payment: [Cash ▾]
Cash Received: [2000]
Change: ₹407

Bill discount:
- Same toggle: "%" or "₹"
- Updates in real-time
- Cannot exceed total

TOTAL: large, gold colored, 28px font-bold

For split payment:
- Shows two inputs: Cash [___] + GPay [___]
- Must sum to total

#### COMPLETE button flow:
1. Validate: customer name required, salesman required
2. Confirm dialog: "Complete bill for ₹1,593?"
3. POST /api/billing/bills/complete
4. On success: show receipt modal
5. Receipt modal has [Print Receipt] button
6. After print/close: tab closes, new empty tab opens

#### HOLD button:
1. POST /api/billing/bills/hold
2. Bill saved as 'held' in DB
3. Tab disappears from tab bar
4. Success toast: "Bill held. Resume from Held Bills."

#### Held Bills Drawer:
Slides in from right:
┌──────────────────────────────┐
│ HELD BILLS           [Close] │
├──────────────────────────────┤
│ Ravi Kumar                   │
│ 2 items · ₹1,200             │
│ Held: 5 mins ago             │
│ [Resume] [Discard]           │
├──────────────────────────────┤
│ Walk-in Customer             │
│ 3 items · ₹899               │
│ Held: 12 mins ago            │
│ [Resume] [Discard]           │
└──────────────────────────────┘

Resume: loads held bill into new tab

#### Receipt Print (ReceiptPrint.tsx)
Print-formatted 80mm receipt using react-to-print:
```css
@media print {
  body * { visibility: hidden; }
  #receipt, #receipt * { visibility: visible; }
  #receipt { 
    position: fixed; top: 0; left: 0;
    width: 80mm;
    font-family: monospace;
    font-size: 12px;
  }
}
```

Receipt content:
  SOWAAT MENS WEAR
Premium Menswear Store
Your Town, Tamil Nadu
────────────────────────────
Bill No: SW-2025-0047
Date: 05/04/2025  Time: 3:42PM
Cashier: Karthik
Salesman: Murugan
────────────────────────────
1x Blue T-Shirt (M)
MRP:₹399  10% off  ₹359.00
2x Slim Fit Shirt (L)
MRP:₹599           ₹1198.00
────────────────────────────
Subtotal:          ₹1,557.00
Item Discount:     -  ₹40.00
Bill Discount:     -   ₹0.00
Taxable Amt:       ₹1,517.00
GST @ 5%:         +  ₹75.85
Round Off:         +   ₹0.15
────────────────────────────
TOTAL:             ₹1,593.00
────────────────────────────
Cash Received:     ₹2,000.00
Change:            -  ₹407.00
────────────────────────────
Payment: CASH
Thank you for shopping!
Visit us again soon :)
────────────────────────────

---

### STOCK ENTRY PAGE (/stock)

Form:
┌──────────────────────────────────────────┐
│ NEW STOCK ENTRY                          │
│                                          │
│ Supplier      [Select Supplier      ▾]   │
│ Category      [T-Shirts             ▾]   │
│ Sub Category  [T-Shirt Sleeveless   ▾]   │
│ Size          [M                    ▾]   │
│ Quantity      [10    ]                   │
│ Incoming ₹    [180   ]  (cost price)     │
│ Selling ₹     [399   ]  (MRP)           │
│ GST %         [5     ]                   │
│ Notes         [Summer collection   ]     │
│                                          │
│           [SAVE & GENERATE BARCODES]     │
└──────────────────────────────────────────┘

All dropdowns cascade:
- Supplier selected → Category dropdown shows supplier's categories
- Category selected → SubCategory shows subcategories

On submit:
1. POST /api/billing/stock/entry
2. Navigate to /stock/barcodes?entryId=xxx

#### Barcode Print Page (/stock/barcodes)
┌────────────────────────────────────────────────────┐
│ BARCODES GENERATED                  [🖨 PRINT ALL] │
│ T-Shirt Sleeveless · Size M · 10 labels            │
├────────────────────────────────────────────────────┤
│                                                    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│ │ ╫╫╫╫╫╫╫  │ │ ╫╫╫╫╫╫╫  │ │ ╫╫╫╫╫╫╫  │ │  ...  │ │
│ │SW20250405│ │SW20250405│ │SW20250405│ │       │ │
│ │  0001    │ │  0002    │ │  0003    │ │       │ │
│ │T-Shirt SL│ │T-Shirt SL│ │T-Shirt SL│ │       │ │
│ │  Size: M │ │  Size: M │ │  Size: M │ │       │ │
│ │  ₹399    │ │  ₹399    │ │  ₹399    │ │       │ │
│ └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│                                                    │
└────────────────────────────────────────────────────┘

Print CSS for LP 46 NEO label printer:
```css
@media print {
  .label {
    width: 38mm;      /* 1.5 inch label */
    height: 25mm;
    margin: 1mm;
    border: none;
    page-break-inside: avoid;
    font-family: monospace;
  }
  .barcode-container {
    display: grid;
    grid-template-columns: repeat(3, 38mm);
  }
}
```

Each label shows:
- Barcode (react-barcode, CODE128 format)
- Barcode number
- Product name (truncated to fit)
- Size
- MRP ₹XXX (bold)

---

### RETURNS PAGE (/returns)

Step 1 — Find original bill:
┌──────────────────────────────────────────────┐
│ RETURN / REPLACEMENT                         │
│                                              │
│ Find Bill:                                   │
│ [🔍 Scan bill barcode or enter bill number]  │
│ Bill Number: [SW-2025-____]      [FIND →]   │
│                                              │
│ OR search by customer phone:                 │
│ [📱 Customer phone number]       [SEARCH]   │
└──────────────────────────────────────────────┘

Step 2 — Bill found, select items:
┌──────────────────────────────────────────────┐
│ Bill: SW-2025-0047                           │
│ Customer: Ravi Kumar  📱 9876543210          │
│ Date: 5 Apr 2025  Total: ₹1,593             │
├──────────────────────────────────────────────┤
│ SELECT ITEMS TO RETURN:                      │
│                                              │
│ ☑ Blue T-Shirt (M)    ₹359   [Reason ▾]    │
│ ☐ Slim Fit Shirt (L)  ₹599                  │
├──────────────────────────────────────────────┤
│ RETURN TYPE:                                 │
│ ● Replacement  ○ Refund  ○ Partial          │
└──────────────────────────────────────────────┘

Step 3 — Replacement (if selected):
┌──────────────────────────────────────────────┐
│ REPLACEMENT ITEM                             │
│ Returning: Blue T-Shirt (M)  ₹359           │
│                                              │
│ [🔍 Scan replacement item barcode]          │
│                                              │
│ ✓ Cotton T-Shirt (XL)  ₹399                │
│   Price difference: +₹40                    │
│   Customer pays extra: ₹40                  │
│                                              │
│ [PROCESS RETURN & REPLACEMENT]              │
└──────────────────────────────────────────────┘

Reason dropdown options:
- Size Issue
- Color Not as Expected
- Defective Item
- Customer Changed Mind
- Wrong Item Delivered
- Other

---

### REPORTS PAGE (/reports)
┌──────────────────────────────────────────────────────────┐
│ REPORTS                                                  │
│                                                          │
│ [Daily] [Weekly] [Monthly] [Custom Range]                │
│ From: [05/04/2025] To: [05/04/2025]  [APPLY]            │
│                                   [⬇ Export Excel]      │
├──────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│ │ Revenue  │ │ Bills    │ │ Items    │ │ Returns    │  │
│ │ ₹24,500  │ │    47    │ │   132   │ │      3     │  │
│ └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Revenue Over Time [Bar Chart]                        │ │
│ │ - Daily: bars by hour                                │ │
│ │ - Weekly: bars by day                                │ │
│ │ - Monthly: bars by date                              │ │
│ └──────────────────────────────────────────────────────┘ │
│ ┌────────────────────┐ ┌──────────────────────────────┐  │
│ │ Payment Methods    │ │ Sales by Category            │  │
│ │ [Donut Chart]      │ │ [Pie Chart]                  │  │
│ │ Cash: ₹14,700 60%  │ │ T-Shirts: 45%               │  │
│ │ GPay:  ₹8,575 35%  │ │ Shirts: 35%                 │  │
│ │ Card:  ₹1,225  5%  │ │ Pants: 20%                  │  │
│ └────────────────────┘ └──────────────────────────────┘  │
│                                                          │
│ TOP SELLING PRODUCTS                                     │
│ ┌──────────────────────────────────────────────────┐    │
│ │ Rank│ Product      │ Qty │ Revenue  │ Returns    │    │
│ │  1  │ Blue T-Shirt │  24 │ ₹8,616  │  1         │    │
│ │  2  │ Slim Shirt   │  18 │ ₹10,782 │  0         │    │
│ └──────────────────────────────────────────────────┘    │
│                                                          │
│ SALESMAN PERFORMANCE                                     │
│ ┌──────────────────────────────────────────────────┐    │
│ │ Name    │ Bills │ Revenue  │ Avg Bill │ Returns  │    │
│ │ Murugan │  28   │ ₹14,200  │ ₹507     │  1       │    │
│ │ Karthik │  19   │ ₹10,300  │ ₹542     │  2       │    │
│ └──────────────────────────────────────────────────┘    │
│                                                          │
│ ALL BILLS                                                │
│ ┌──────────────────────────────────────────────────┐    │
│ │ Bill# │ Customer │ Items │ Total  │ Pay │ Status  │    │
│ │ 0047  │ Ravi K   │   3   │ ₹1,593 │ Cash│ Done   │    │
│ │ [View Details] [🖨 Reprint]                       │    │
│ └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘

Excel Export (4 sheets via xlsx library):
- Sheet 1: Summary (all stat cards data)
- Sheet 2: Bills (all bills in date range)
- Sheet 3: Item-wise (each line item)
- Sheet 4: Salesman performance

---

### ADMIN PAGES

#### /admin/suppliers
Table: Name | Phone | GST | Status | Actions
Add/Edit modal form

#### /admin/categories
Two-level tree view:
▼ T-Shirts (main)        [+Sub] [✏] [🗑]
T-Shirt Sleeveless   [✏] [🗑]
T-Shirt Round Neck   [✏] [🗑]
T-Shirt Polo         [✏] [🗑]
▼ Shirts (main)          [+Sub] [✏] [🗑]
Casual Shirt         [✏] [🗑]
Formal Shirt         [✏] [🗑]
▶ Pants (main)           [+Sub] [✏] [🗑]
[+ Add Main Category]

#### /admin/salesmen
Table: Name | Phone | Bills Today | Status | Actions
Add/Edit modal

#### /admin/staff
Table: Name | Email | Role | Last Login | Status | Actions
Add staff: name, email, temp password, role, permissions
Edit permissions: toggles for each permission + max discount %
Each admin can create another admin (same or lower role)

---

## SHARED INVENTORY LOGIC

In billing-bills.ts complete route:
```typescript
// After bill completed, deduct stock
for (const item of bill.items) {
  await Product.findByIdAndUpdate(item.product, {
    $inc: { stock: -item.quantity }
  })
  
  // If stock hits 0, hide from website
  const product = await Product.findById(item.product)
  if (product.stock <= 0) {
    product.isActive = false
    await product.save()
  }
}

// Trigger website ISR revalidation
await revalidateFrontend('/products')
await revalidateFrontend('/')
```

In billing-stock.ts entry route:
```typescript
// Stock entry increases stock
for (const productId of stockEntry.productIds) {
  const product = await Product.findById(productId)
  if (product.stock > 0 && !product.isActive) {
    product.isActive = true  // re-enable on website
    await product.save()
  }
}
```

In billing-returns.ts process route:
```typescript
// Returned items go back to stock
for (const item of return.returnedItems) {
  await Product.findByIdAndUpdate(item.product, {
    $inc: { stock: item.quantity },
    isActive: true
  })
}

// Replacement items leave stock
for (const item of return.replacementItems) {
  await Product.findByIdAndUpdate(item.product, {
    $inc: { stock: -item.quantity }
  })
}
```

---

## MOBILE RESPONSIVE

Billing page on tablet (primary device):
- Landscape orientation preferred (manifest sets it)
- Two-column layout maintained on tablet
- Larger touch targets for all buttons
- Scanner input always accessible

Billing page on mobile (portrait):
- Stack: scanner + items (top), summary (bottom)
- Summary collapses/expands
- Bottom sheet for payment summary
- Large COMPLETE button fixed at bottom

Sidebar on mobile:
- Hidden, hamburger in topbar
- Full-screen overlay

Reports on mobile:
- Charts: full width, scroll horizontally if needed
- Tables: horizontal scroll

---

## SECURITY

- billing_token JWT: separate from website tokens
- Permissions checked server-side on every route
- Max discount enforced server-side (never trust client)
- Bill calculations redone server-side on complete
- Rate limiting on login (5 attempts per 15 min)
- All routes require valid billing_token except /login

---

## ENVIRONMENT VARIABLES

Add to /backend/.env:
BILLING_JWT_SECRET=your_billing_jwt_secret

Create /billing/.env.local:
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com

---

## SEED DATA FOR BILLING

Add to existing seed script:
1. Create superadmin: 
   email: billing@sowaatmenswear.com, password: billing123
2. Create 3 salesmen: Murugan, Karthik, Selvam
3. Create suppliers: Supplier A, Supplier B
4. Create categories: T-Shirts, Shirts, Pants
   Subcategories: T-Shirt Polo, T-Shirt Round Neck,
   Casual Shirt, Formal Shirt, Cargo Pants, Regular Pants
5. Create 2 sample held bills

---

## CHECKLIST

Backend:
- [ ] All 6 new models created
- [ ] Product model updated with barcode/sku/incomingPrice fields
- [ ] billing-auth routes + billingAuthMiddleware
- [ ] billing-suppliers routes
- [ ] billing-categories routes (nested categories)
- [ ] billing-stock routes + unique barcode generation
- [ ] billing-bills routes (scan, calculate, hold, complete)
- [ ] billing-returns routes
- [ ] billing-reports routes with all aggregations
- [ ] billing-admin routes
- [ ] All routes mounted in server.ts
- [ ] Shared inventory logic (stock deduct/add + isActive toggle)
- [ ] revalidateFrontend called after stock changes
- [ ] Seed data updated

Billing Frontend:
- [ ] PWA config (next-pwa + manifest.json)
- [ ] Login page
- [ ] Sidebar + topbar layout
- [ ] Dashboard with 4 stat cards + 4 charts
- [ ] Multi-tab billing (Zustand store)
- [ ] Barcode scanner detection (useBarcodeScanner hook)
- [ ] Bill item rows with item-level discount
- [ ] Payment summary with real-time calculation
- [ ] Bill discount (% and ₹)
- [ ] GST 5% calculation
- [ ] Round off calculation
- [ ] Cash received + change calculation
- [ ] Split payment (cash + gpay)
- [ ] Hold bill + held bills drawer
- [ ] Resume held bill into new tab
- [ ] Complete bill → receipt modal
- [ ] Receipt print (80mm thermal format)
- [ ] Barcode label print (LP 46 NEO format)
- [ ] Stock entry form with cascading dropdowns
- [ ] Barcode generation + print page
- [ ] Returns page (3 step flow)
- [ ] Reports page with date range picker
- [ ] All 4 charts (bar, donut, pie, tables)
- [ ] Excel export (4 sheets)
- [ ] Admin: suppliers CRUD
- [ ] Admin: categories tree CRUD
- [ ] Admin: salesmen CRUD
- [ ] Admin: staff CRUD with permissions
- [ ] Mobile responsive (tablet landscape primary)
- [ ] Sound effects (beep on scan)
- [ ] Error handling on all API calls
- [ ] Loading skeletons

Build everything completely.
No placeholders. No TODOs.
Full working code for every file.
This is a production POS system.