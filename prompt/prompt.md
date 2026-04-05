Update Homepage 3 (Catalogue/Max Fashion theme) with a complete 
offer carousel system replacing the hero, a new arrivals section, 
and full admin control over everything. Build this completely.

---

## OVERVIEW OF CHANGES

1. Hero section → replaced with Offer Carousel (3 template designs)
2. Below carousel → New Arrivals section (weekly new stock)
3. Below new arrivals → existing filter + product grid (unchanged)
4. Admin: Offers management page (full CRUD + toggle + template picker)
5. Admin: New Arrivals management page
6. Admin: Homepage Sections panel updated to control all sections
7. Individual offer pages (/offers/[slug]) showing offer products
8. All sections customizable and togglable from admin

---

## DATABASE — NEW/UPDATED MODELS

### Offer Model (update existing)
```typescript
{
  title: string,               // "Weekend Sale"
  slug: string,                // "weekend-sale" (auto-generated)
  subtitle: string,            // "Up to 50% off on T-Shirts"
  description: string,         // longer description for offer page
  carouselTemplate: enum['fullbleed', 'splitcard', 'spotlight'],
  image: string,               // main offer image (Cloudinary)
  backgroundImage: string,     // optional bg image
  accentColor: string,         // optional override, default --gold
  discountPercent: number,     // "50" → shown as "50% OFF"
  discountLabel: string,       // custom label "BUY 2 GET 1" etc
  ctaText: string,             // "SHOP NOW" / "GRAB THE DEAL"
  products: [ObjectId],        // products in this offer
  startTime: Date,
  endTime: Date,               // null = no expiry
  hasCountdown: boolean,       // show countdown timer on carousel
  isActive: boolean,           // master toggle
  showOnCarousel: boolean,     // show on homepage carousel
  order: number,               // carousel slide order
  createdAt: Date
}
```

### NewArrival Model
```typescript
{
  product: ObjectId,           // ref to Product
  addedAt: Date,               // when added to new arrivals
  weekLabel: string,           // "This Week" / "Apr Week 1"
  isActive: boolean,
  order: number
}
```

### HomepageSections Model (update existing settings)
```typescript
{
  // catalogue theme sections
  catalogueSections: [{
    id: string,                // 'offer-carousel', 'new-arrivals', 
                               // 'products-grid', 'combo-offers'
    label: string,
    isVisible: boolean,
    order: number,
    canDelete: boolean         // products-grid cannot be deleted
  }]
}
```

---

## BACKEND — NEW/UPDATED API ROUTES

### Offers API

GET /api/offers
→ all active offers (public)
→ supports ?showOnCarousel=true for homepage

GET /api/offers/:slug
→ single offer with populated products (public)
→ used for individual offer page

POST /api/offers (admin protected)
PUT /api/offers/:id (admin protected)
DELETE /api/offers/:id (admin protected)
PATCH /api/offers/:id/toggle (admin protected)
→ toggles isActive + showOnCarousel

PATCH /api/offers/reorder (admin protected)
→ body: [{ id, order }] array
→ updates order of carousel slides

### New Arrivals API

GET /api/new-arrivals
→ all active new arrivals with populated product data (public)
→ sorted by order

GET /api/admin/new-arrivals (admin protected)
→ all new arrivals (active + inactive)

POST /api/admin/new-arrivals (admin protected)
→ body: { productId, weekLabel }
→ add product to new arrivals

DELETE /api/admin/new-arrivals/:id (admin protected)
→ remove from new arrivals

PATCH /api/admin/new-arrivals/reorder (admin protected)
→ body: [{ id, order }]

PATCH /api/admin/new-arrivals/:id/toggle (admin protected)
→ toggle isActive

### Homepage Sections API

GET /api/homepage-sections/:theme (public)
→ theme = 'catalogue' | 'allensolly' | 'magazine'
→ returns ordered sections with visibility

PUT /api/admin/homepage-sections/:theme (admin protected)
→ update sections order + visibility
→ triggers revalidation of homepage

---

## FRONTEND — OFFER CAROUSEL

### Component: OfferCarousel.tsx

Fetches active carousel offers from API.
If no active offers → section is hidden completely (no empty space).
If offers exist → renders full-width carousel.

Carousel behavior:
- Auto-advances every 5 seconds
- Pauses on hover
- Manual navigation: left/right arrow buttons
- Dot indicators at bottom
- Smooth slide transition (CSS transform, not opacity)
- Swipe gesture support on mobile (touchstart + touchend)

Each slide renders the correct template based on 
offer.carouselTemplate field.

---

## THE 3 CAROUSEL TEMPLATES

### TEMPLATE 1 — "Full Bleed"
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  [FULL WIDTH OFFER IMAGE AS BACKGROUND]                  │
│  [dark gradient overlay left to right]                   │
│                                                          │
│    WEEKEND                    ┌──────────────────┐       │
│    SALE                       │  🕐 ENDS IN      │       │
│    ─────────                  │  02 : 14 : 33    │       │
│    Up to 50% off              │  HRS  MIN  SEC   │       │
│    on all T-Shirts            └──────────────────┘       │
│                                                          │
│    [  SHOP THE SALE →  ]                                 │
│                                                          │
│  ●  ○  ○                                                 │  ← dots
└──────────────────────────────────────────────────────────┘

Styling:
- Height: 520px desktop, 300px mobile
- Background: offer image, object-fit cover
- Overlay: linear-gradient(to right, rgba(0,0,0,0.75) 0%, 
  rgba(0,0,0,0.2) 60%, transparent 100%)
- Left content area: padding-left 80px, centered vertically
- Title: Playfair Display, 56px desktop / 28px mobile, 
  white, font-bold, line-height 1.1
- Subtitle: DM Sans, 18px, white/80, mt-3
- Countdown box: bg rgba(255,255,255,0.15), 
  backdrop-blur-sm, border border-white/20,
  rounded-lg, px-4 py-3, inline-flex gap-4
- Countdown digits: DM Sans, 32px, white, font-bold
- Countdown labels: text-xs, white/60, uppercase
- CTA button: bg --gold, text black, font-bold uppercase,
  px-8 py-3, no border-radius (rectangular), 
  hover bg --gold-hover, mt-6
- Dots: bottom-center, white circles, active = filled gold

### TEMPLATE 2 — "Split Card"
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌──────────────────────────┬─────────────────────────┐  │
│  │                          │                         │  │
│  │  NEW ARRIVALS            │                         │  │
│  │  ─────────────           │    [PRODUCT IMAGE]      │  │
│  │  Fresh styles            │    [FULL HEIGHT]        │  │
│  │  every week              │                         │  │
│  │                          │                         │  │
│  │  ┌──────────────────┐    │                         │  │
│  │  │ 30% OFF          │    │                         │  │
│  │  │ on all Shirts    │    │                         │  │
│  │  └──────────────────┘    │                         │  │
│  │                          │                         │  │
│  │  🕐 02 : 14 : 33         │                         │  │
│  │                          │                         │  │
│  │  [ EXPLORE NOW → ]       │                         │  │
│  │                          │                         │  │
│  └──────────────────────────┴─────────────────────────┘  │
│                          ● ○ ○                           │
└──────────────────────────────────────────────────────────┘

Styling:
- Height: 500px desktop, auto mobile (stacks vertically)
- Background: --surface (#F8F6F2)
- Left panel (50%): bg white, padding 60px, 
  gold left border 3px (border-l-4 border-[--gold])
- Title: Playfair Display, 42px, --text-primary, font-bold
- Divider line: 40px wide, 2px, --gold, my-4
- Subtitle: DM Sans, 16px, --text-secondary
- Discount badge: bg --gold, text black, 
  inline-block px-4 py-2, font-bold, text-lg, mt-4
- Countdown: DM Sans, inline flex, 
  digits gold (#C9A84C) font-bold 28px,
  separators grey, labels text-xs uppercase below each
- CTA: outlined button, border-2 border-[--navbar-bg],
  text --navbar-bg, font-bold uppercase px-6 py-3,
  hover: bg --navbar-bg text white, transition
- Right panel (50%): image fills completely, object-cover
- Gold corner accent: absolute top-0 right-0,
  w-16 h-16, border-t-4 border-r-4 border-[--gold]

Mobile: stacks → image on top (200px height), 
content below with px-6 py-8

### TEMPLATE 3 — "Centered Spotlight"
┌──────────────────────────────────────────────────────────┐
│  [BLURRED BACKGROUND IMAGE — full width]                 │
│  [dark overlay]                                          │
│                                                          │
│         ┌────────────────────────────────┐               │
│         │  ✦  COMBO OFFER  ✦            │               │
│         │  ─────────────────────────    │               │
│         │  Buy 2 T-Shirts              │               │
│         │  Get 1 FREE                  │               │
│         │                              │               │
│         │  ┌──────┐ ┌──────┐ ┌──────┐  │               │
│         │  │[img] │ │[img] │ │[img] │  │               │
│         │  │ ₹399 │ │ ₹499 │ │ ₹299 │  │               │
│         │  └──────┘ └──────┘ └──────┘  │               │
│         │                              │               │
│         │  🕐  Ends in 02:14:33        │               │
│         │                              │               │
│         │  [   GRAB THE DEAL   ]       │               │
│         └────────────────────────────────┘               │
│                      ● ○ ○                               │
└──────────────────────────────────────────────────────────┘

Styling:
- Height: 560px desktop, auto mobile
- Background: offer image blurred (filter: blur(8px) + scale(1.1)
  to hide blur edges), dark overlay rgba(0,0,0,0.55)
- Center card: bg white, rounded-2xl, shadow-2xl,
  max-w-lg, mx-auto, px-10 py-8
- Top label: text-xs uppercase tracking-widest --text-secondary,
  with ✦ decorative symbols either side
- Divider: full width 1px --border, my-3
- Title: Playfair Display, 38px, --text-primary, text-center,
  font-bold, leading-tight
- Product thumbnails row: 3 small cards side by side
  each: 80px wide, image + price below, rounded-lg overflow-hidden
  border border-[--border]
- Countdown: centered, digits --gold 24px bold,
  labels text-xs --text-secondary
- CTA: full width, bg --gold, text black, font-bold uppercase,
  py-3, rounded-lg, hover bg --gold-hover

Mobile: card becomes full width minus px-4,
thumbnails smaller (64px)

---

## INDIVIDUAL OFFER PAGE — /offers/[slug]

When user clicks any carousel slide CTA → goes to this page.

Layout:
┌──────────────────────────────────────────────────────────┐
│  NAVBAR                                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [OFFER HERO BANNER — slim version of carousel slide]   │
│  Height: 280px, same template styling but shorter        │
│  Shows: offer title + discount + countdown if active     │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  PRODUCTS IN THIS OFFER                                  │
│  ─────────────────────                                   │
│  "X products available"          SORT BY [Relevance ▾]  │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ product  │ │ product  │ │ product  │ │ product  │   │
│  │  card    │ │  card    │ │  card    │ │  card    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│  [same ProductCard as rest of site]                      │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  YOU MIGHT ALSO LIKE                                     │
│  [4 related products horizontal scroll]                  │
└──────────────────────────────────────────────────────────┘

- ISR: revalidate 60 seconds
- generateStaticParams for all active offer slugs
- If offer expired: show "This offer has ended" banner
  but still show products without discount
- Sort options: Relevance, Price: Low-High, Price: High-Low
- Mobile: 2 col product grid

---

## NEW ARRIVALS SECTION

### Component: NewArrivalsSection.tsx

Position: directly below offer carousel on homepage
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  NEW ARRIVALS          [VIEW ALL NEW ARRIVALS →]         │
│  ─────────────                                           │
│  Fresh styles added this week                            │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │          │ │          │ │          │ │          │   │
│  │ product  │ │ product  │ │ product  │ │ product  │   │
│  │  card    │ │  card    │ │  card    │ │  card    │   │
│  │          │ │          │ │          │ │          │   │
│  │ [NEW]    │ │ [NEW]    │ │ [NEW]    │ │ [NEW]    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ ...more  │ │          │ │          │ │          │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│            [LOAD MORE]  ← loads next 8                  │
│                                                          │
└──────────────────────────────────────────────────────────┘

Styling:
- Section bg: --bg (white)
- Section padding: py-16 px-6
- Heading: Playfair Display, 32px, --text-primary
- Gold underline: 48px wide, 3px, --gold, below heading
- Subtitle: DM Sans 14px, --text-secondary
- "VIEW ALL" link: --gold, text-sm uppercase tracking-widest,
  underline on hover
- Product grid: 4 col desktop, 2 col mobile, gap-4
- "NEW" badge on each card: bg --gold, text black,
  text-xs font-bold px-2 py-0.5 absolute top-2 left-2
- "LOAD MORE" button: outlined, border --border,
  text --text-secondary, hover border --gold hover text --gold
  px-8 py-3, mx-auto block

Fetches from GET /api/new-arrivals
Shows max 8 initially, "LOAD MORE" fetches next 8
ISR: revalidate 300 seconds

---

## ADMIN — OFFERS MANAGEMENT PAGE
/admin/offers (complete rebuild)

### Page Layout:
┌─────────────────────────────────────────────┐
│ OFFERS                          [+ CREATE]   │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Active Carousel (3 live)                 │ │
│ │                                          │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │
│ │ │Template 1│ │Template 2│ │Template 3│  │ │
│ │ │Weekend   │ │New Stock │ │Combo Deal│  │ │
│ │ │Sale      │ │          │ │          │  │ │
│ │ │[ON ●]    │ │[ON ●]    │ │[OFF ○]   │  │ │
│ │ │[Edit][↑↓]│ │[Edit][↑↓]│ │[Edit]    │  │ │
│ │ └──────────┘ └──────────┘ └──────────┘  │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ All Offers                                   │
│ ┌──────────────────────────────────────────┐ │
│ │ # │ Title      │ Template │ Status │ Act │ │
│ │ 1 │ Weekend... │ Fullbleed│ LIVE   │ ✏🗑 │ │
│ │ 2 │ New Stock  │ Split    │ LIVE   │ ✏🗑 │ │
│ │ 3 │ Combo Deal │ Spotlight│ OFF    │ ✏🗑 │ │
│ └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

### Create/Edit Offer Drawer/Modal:

Full right-side drawer (700px wide):
┌─────────────────────────────────────────────────────┐
│ CREATE OFFER                               [✕ Close] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ BASIC INFO                                          │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Offer Title *     [Weekend Sale              ]  │ │
│ │ Slug              [weekend-sale  (auto)]         │ │
│ │ Subtitle          [Up to 50% off on T-Shirts ]  │ │
│ │ Description       [                          ]  │ │
│ │                   [multiline textarea        ]  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ CAROUSEL TEMPLATE *                                 │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │ │
│ │ │Full Bleed│ │ │ │Split Card│ │ │ │Spotlight │ │ │
│ │ │ preview  │ │ │ │ preview  │ │ │ │ preview  │ │ │
│ │ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │ │
│ │ Template 1   │ │ Template 2   │ │ Template 3   │ │
│ │ Full Bleed   │ │ Split Card   │ │ Spotlight    │ │
│ │ [● SELECT]   │ │ [○ Select]   │ │ [○ Select]   │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ │
│                                                     │
│ OFFER IMAGE *                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │  [  📷 Upload Image  ]  or drag & drop          │ │
│ │  Recommended: 1400x600px for Full Bleed         │ │
│ │  Recommended: 700x500px for Split Card          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ DISCOUNT INFO                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Discount %    [50         ]                     │ │
│ │ OR                                              │ │
│ │ Custom Label  [BUY 2 GET 1] (overrides % label) │ │
│ │ CTA Button    [SHOP THE SALE              ]     │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ SCHEDULE                                            │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Start Date  [2025-04-05] [10:00]                │ │
│ │ End Date    [2025-04-07] [23:59]  ☐ No Expiry  │ │
│ │ Show Countdown Timer  [● Yes / ○ No]            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ PRODUCTS IN THIS OFFER                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Search products: [🔍 Type to search...      ]   │ │
│ │                                                 │ │
│ │ Selected (3):                                   │ │
│ │ [img] Blue T-Shirt     ₹399    [✕ Remove]       │ │
│ │ [img] Striped Shirt    ₹599    [✕ Remove]       │ │
│ │ [img] Cotton Pants     ₹799    [✕ Remove]       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ VISIBILITY                                          │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Show on Homepage Carousel  [● ON / ○ OFF]       │ │
│ │ Offer is Active            [● ON / ○ OFF]       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│              [CANCEL]  [SAVE OFFER]                 │
└─────────────────────────────────────────────────────┘

Template preview cards:
- Small visual thumbnail showing the layout style
- Gold border when selected
- Radio-style selection (only one template per offer)

Product search:
- Type in search box → live search from products API
- Shows matching products as dropdown list
- Click to add to selected list
- Selected products show with remove button

---

## ADMIN — NEW ARRIVALS PAGE
/admin/new-arrivals (new page)
┌──────────────────────────────────────────────────────┐
│ NEW ARRIVALS                    [+ ADD PRODUCTS]      │
│ Manage weekly new arrivals shown on homepage          │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Week Label: [This Week ▾]  ← quick filter by week    │
│                                                      │
│ Drag to reorder ↕                                    │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ ≡  [img] Blue Polo T-Shirt    ₹399  This Week  │   │
│ │         Added: 5 Apr 2025     [👁 ON]  [🗑]    │   │
│ └────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────┐   │
│ │ ≡  [img] Linen Summer Shirt   ₹599  This Week  │   │
│ │         Added: 5 Apr 2025     [👁 ON]  [🗑]    │   │
│ └────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────┐   │
│ │ ≡  [img] Cargo Pants          ₹799  Last Week  │   │
│ │         Added: 28 Mar 2025    [👁 OFF] [🗑]    │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ [SAVE ORDER]                                         │
└──────────────────────────────────────────────────────┘

"+ ADD PRODUCTS" opens a modal:
┌──────────────────────────────────────────┐
│ Add New Arrivals               [✕]        │
├──────────────────────────────────────────┤
│ Week Label: [This Week              ]    │
│                                          │
│ Search: [🔍 Search products...     ]     │
│                                          │
│ Results:                                 │
│ ☐ [img] Blue Polo T-Shirt    ₹399       │
│ ☐ [img] Striped Shirt        ₹599       │
│ ☑ [img] Linen Summer Shirt   ₹499       │
│ ☑ [img] Cargo Pants          ₹799       │
│                                          │
│ Selected: 2 products                     │
│                                          │
│ [CANCEL]  [ADD SELECTED TO NEW ARRIVALS] │
└──────────────────────────────────────────┘

Features:
- Bulk add multiple products at once
- Week label (text field, e.g. "This Week", "Apr Week 2")
- Drag to reorder (react-beautiful-dnd or @dnd-kit/core)
- Toggle individual items on/off
- Delete removes from new arrivals (not from products)
- Products already in new arrivals marked with ✓ in search

---

## ADMIN — HOMEPAGE SECTIONS (UPDATE EXISTING)

Update /admin/layout/catalogue → Homepage Sections tab

Rename sections to match new structure:
┌────────────────────────────────────────────┐
│ HOMEPAGE SECTIONS (Catalogue Theme)        │
│ Drag to reorder ↕                          │
│                                            │
│ ≡  Offer Carousel        [👁 green] ----   │ ← can't delete
│    3 offers currently live                 │
│    [Manage Offers →]                       │
│                                            │
│ ≡  New Arrivals          [👁 green] [🗑]   │
│    15 products currently active            │
│    [Manage New Arrivals →]                 │
│                                            │
│ ≡  Products Grid         [👁 green] ----   │ ← can't delete
│    124 active products                     │
│                                            │
│ ≡  Combo Offers          [👁 green] [🗑]   │
│    2 active combo offers                   │
│                                            │
│ [SAVE ORDER]                               │
└────────────────────────────────────────────┘

Each section row shows:
- Live stats (count of active items)
- Quick link to manage that section
- Eye toggle: green = visible, red = hidden
- Drag handle for reorder
- Delete (where allowed)

When eye toggled off → section disappears from live homepage
immediately (triggers ISR revalidation of homepage)

---

## HOMEPAGE 3 FINAL SECTION ORDER

Announcement Bar
Navbar (Max Fashion style)
Category Nav with Mega Dropdowns
[IF VISIBLE] Offer Carousel ← NEW
[IF VISIBLE] New Arrivals ← NEW
Filter Sidebar + Products Grid ← existing
[IF VISIBLE] Combo Offers ← existing
Footer


Each [IF VISIBLE] section checks the homepage sections config.
If isVisible: false → render null (no empty space, no layout shift).

---

## MOBILE RESPONSIVE

### Offer Carousel Mobile:

Template 1 (Full Bleed) on mobile:
- Height: 320px
- Gradient covers more (text always readable)
- Title: 26px
- Countdown: smaller boxes, digits 22px
- CTA: full width button at bottom of text

Template 2 (Split Card) on mobile:
- Stack vertically
- Image: top, 200px height, full width
- Content: below, white bg, px-6 py-6
- Gold left border becomes gold top border

Template 3 (Spotlight) on mobile:
- Card: full width, mx-4
- Thumbnails: 56px each
- Title: 28px

Carousel dots on mobile: always visible, larger tap targets (12px dots)
Arrow buttons on mobile: hidden (swipe instead)

### New Arrivals Mobile:
- 2 column grid
- "LOAD MORE" button: full width

### Offer Page Mobile:
- Hero banner: 220px height
- Product grid: 2 columns

---

## PERFORMANCE

Offer Carousel:
- Fetch carousel offers: ISR revalidate 60s
- Images: Next.js <Image> with priority={true} (above fold)
- Preload first slide image
- Other slide images: lazy loaded

New Arrivals:
- ISR revalidate 300s
- Images: lazy load

Offer pages (/offers/[slug]):
- generateStaticParams for all active offers
- Revalidated when offer is updated

After admin saves any offer or new arrival:
- Trigger revalidatePath('/') 
- Trigger revalidatePath('/offers/[slug]')

---

## CHECKLIST

Backend:
- [ ] Offer model updated with new fields
- [ ] NewArrival model created
- [ ] All offer API routes (CRUD + toggle + reorder)
- [ ] All new arrivals API routes (CRUD + toggle + reorder)
- [ ] Homepage sections API updated
- [ ] ISR revalidation triggered on all admin saves

Frontend:
- [ ] OfferCarousel.tsx component
- [ ] Template 1: Full Bleed (complete with countdown)
- [ ] Template 2: Split Card (complete with countdown)
- [ ] Template 3: Centered Spotlight (complete with countdown)
- [ ] Carousel auto-advance + pause on hover
- [ ] Swipe gesture support on mobile
- [ ] Dot indicators + arrow navigation
- [ ] NewArrivalsSection.tsx component
- [ ] Load more functionality
- [ ] /offers/[slug] page (full offer page)
- [ ] Offer hero banner on offer page
- [ ] Products grid on offer page
- [ ] "Offer expired" state handled
- [ ] Homepage sections visibility check

Admin:
- [ ] /admin/offers page rebuilt
- [ ] Create/edit offer drawer with all fields
- [ ] Template picker with visual previews
- [ ] Cloudinary image upload in offer form
- [ ] Product search + multi-select in offer form
- [ ] Individual offer toggle (isActive + showOnCarousel)
- [ ] Carousel slide reorder (drag or up/down arrows)
- [ ] /admin/new-arrivals page
- [ ] Bulk add products modal with search
- [ ] New arrivals reorder
- [ ] Individual new arrival toggle
- [ ] Homepage sections panel updated with new sections
- [ ] Quick links to manage sections from sections panel
- [ ] Live stats count per section

Mobile:
- [ ] All 3 carousel templates mobile responsive
- [ ] Swipe on mobile carousel
- [ ] New arrivals 2 col mobile
- [ ] Offer page mobile responsive
- [ ] Admin offer form usable on mobile

Build everything completely.
No placeholders. No TODOs.
Full working code for every file.
