# PrintYourVibe

An online store for custom-printed stickers (2D and 3D), polaroids, wall posters, and laptop, fridge and diary stickers. It's built for India: prices in ₹, online payments through Razorpay (UPI, cards, netbanking) and Cash on Delivery. The store uses the **Midnight Neon** theme.

## Status

| Step | What | State |
| --- | --- | --- |
| 0 | Pick a theme (`design/theme-showcase.html`) | Done: Midnight Neon |
| 1 | Storefront: catalog, listings, search, product pages, cart | Done |
| 2 | Custom studio and build-your-own sticker packs | Done |
| 3 | Accounts, checkout, Razorpay and Cash on Delivery | Done |
| 4 | Admin panel, including bulk CSV import, coupons and reviews | Done |
| 5 | Launch readiness and the deployment guide | **In progress**: server kit, backups and go-live checklist ([DEPLOY.md](DEPLOY.md)), then search, speed, accessibility and security are done; tests in the repo and CI next |

## Run it on your computer

You need Node.js 22 or newer.

```bash
npm install
npm run db:setup   # creates data/printyourvibe.db with 24 product types, 3 custom-studio types, 30 vibes and 5,910 demo products
npm run dev        # open http://localhost:3000
```

Local development needs no accounts or settings. The database is a single file in `data/`, and images uploaded in the custom studio go to `uploads/`.

Already set up from an earlier step? Run `npm run db:migrate` and `npm run db:seed` to add the new tables and product types. Your products and orders aren't touched, and neither are names, prices, order or visibility you changed in the admin panel: the seed only adds what's missing.

In development, emails (sign-in codes, order confirmations) are saved as files in `data/outbox/` instead of being sent, and online payments open a test screen. See `.env.example` for the keys the live site needs.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Unit tests (pricing, sticker packs, shipping, COD, coupons, crops and print resolution, CSV import, price tables, settings, reviews) |
| `npm run lint` / `npm run typecheck` | Code checks |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Write product types, vibes and store settings (`-- sample` adds demo products, `-- clear` removes them) |
| `npm run maintenance` | Daily housekeeping: cancels unpaid online orders after 24 hours, and deletes unused customer uploads and product photos after 7 days. The server runs it every night |
| `npm run backup` | Back up the database and new photos to Cloudflare R2 (keeps 30 daily and 12 monthly snapshots). The server runs it every night |
| `npm run restore` | Bring back the latest backup (`-- --force` to replace an existing database, `-- --from 2026-11-01` for an older one, `-- --photos-only`) |

## What's in Step 1

- **Catalog:**
  - 24 product types, each with its own options and price table: laptop, holographic, transparent, 3D motion, 3D dome, diary, fridge, phone and car stickers, sticker packs, wall, framed and split posters, poster sets, collage kits, mini posters, polaroid sets and wall kits, bookmarks, postcards, keychains, badges, and phone and laptop skins.
  - 30 fandoms and vibes.
- **Demo products:** 5,910, with original generated artwork and names. Nothing is copied from other stores. Remove them with `npm run db:seed -- clear` once your real designs are in.
- **Pages:**
  - home page
  - listings by product type (`/c/…`), by vibe (`/v/…`) and everything (`/shop`), with filters, sorting and "Load more"
  - search with instant suggestions (`/search`)
  - product pages (`/p/…`): option pickers with live prices, a gallery with wall and laptop mock-ups and a poster size guide, a pincode delivery estimate, related and recently viewed products
  - cart drawer and cart page, priced by the server (`/api/cart/quote`), including build-your-own pack prices, "buy 3 posters get 1 free", free shipping above ₹499 and progress hints
  - wishlist and recently viewed, saved in the browser
  - info and policy pages Razorpay asks for (`/pages/…`); the placeholders in [brackets] are highlighted for you to replace
  - newsletter sign-up, WhatsApp chat button, and a phone bottom bar
- **Placeholders:** none left from Step 1. Checkout and accounts arrived in Step 3.

## What's in Step 2

- **Custom studio** (`/custom/stickers`, `/custom/polaroids`, `/custom/posters`). Shoppers upload their own images, see a live preview, and add the result to the cart. Each studio:
  - checks the image's resolution against the print size and warns before it prints blurry
  - saves work in progress in the browser, so a refresh doesn't lose uploads
  - lets the shopper add a note for the printer
- **Sticker studio:**
  - die-cut, circle, square or rounded shapes; die-cut follows the transparent edge of a PNG with a white border
  - matte, glossy, holographic or transparent finishes, each with its own preview
  - 10 to 100 stickers per design, with a per-sticker price
  - an "on a laptop" view drawn to scale
- **Polaroid studio:**
  - upload up to 50 photos at once, crop each one and add handwritten-style captions
  - sets of 10 to 50 prints, classic or mini, with clips or fairy lights
  - a set can have fewer photos than prints; the rest are filled with copies
- **Poster studio:**
  - A4 to A2 or 12 × 18 in, matte or glossy, with or without a frame
  - orientation follows the image
  - an "on the wall" view drawn to scale above a 180 cm sofa
- **Build your own pack** (`/build-your-pack`):
  - pick laptop and mini stickers with + and − counters
  - a sticky bar shows progress to the next pack tier and the saving
  - the pack price is applied in the cart automatically
- **How uploads work:**
  - The browser asks `POST /api/uploads` for a slot, sends the file, then calls `/api/uploads/{id}/complete`.
  - The server checks it's a real PNG, JPG or WebP image (up to 25 MB and 100 megapixels), rotates phone photos the right way up, and makes a web preview and thumbnail with `sharp`.
  - Originals are kept untouched for printing and are never served publicly.
  - The cart API re-checks every custom design and its uploads before pricing it.
  - Files are stored in `uploads/` (or `UPLOADS_DIR`). Cloud storage (Cloudflare R2) comes in Step 5 and uses the same upload flow.
- **Prices:** the custom types' prices are placeholders, in `src/lib/catalog/taxonomy.ts` like the rest. Step 4's admin panel will let you edit them.

## What's in Step 3

- **Checkout** (`/checkout`):
  - Guest checkout, or sign in for faster checkout with saved addresses.
  - Indian address form with a state list, a pincode delivery estimate and checks for mobile numbers and pincodes.
  - Pay online (5% off, up to ₹50) or Cash on Delivery (₹49 fee, ₹199 to ₹3,000).
    - COD isn't offered for custom-studio items, because they're made for one buyer. The `cod.allowCustom` setting changes this.
  - The server prices the cart again before creating the order. If anything changed, the shopper sees the new total first.
- **Payments:**
  - Razorpay Checkout (UPI, cards, netbanking, wallets) with signature checks, plus a webhook for shoppers who close the tab after paying.
  - Without keys, development uses a clearly labelled test payment screen. The live site without keys offers COD only.
  - If the shopper closes the payment window, the order is kept and they can pay again from checkout or the order page.
- **Orders:**
  - Order numbers look like `PYV-7KQ2MD`, with a status timeline: Placed → Confirmed → Printing → Shipped → Delivered.
  - The order page (`/order/PYV-…`) opens from the private link in the confirmation email, or for the signed-in shopper.
  - `/track` finds an order by number and phone, without showing the address.
  - Custom designs and their uploads are saved with the order, so cleanup never deletes them.
- **Emails:** an order confirmation to the shopper, a new-order alert to you (`ORDER_ALERT_EMAIL`) and sign-in codes. They're sent through Resend when `RESEND_API_KEY` is set.
- **Accounts** (`/account`):
  - Sign in with a 6-digit code by email, or Google when its keys are set. No passwords.
  - The account page shows every order placed with that email, including earlier guest orders, plus an address book.
- **Protection:** rate limits on sign-in codes, checkout, tracking and uploads. Order links use long random keys.

### Going live with Razorpay

1. Complete Razorpay KYC. In the dashboard, create **test** API keys and put them in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
2. Turn on **automatic capture** for payments (Account & Settings → Payment capture).
3. Add a webhook pointing to `https://<your site>/api/payments/razorpay/webhook` for `payment.captured`, `order.paid` and `payment.failed`. Put its secret in `RAZORPAY_WEBHOOK_SECRET`.
4. Place a test order with Razorpay's test UPI ID or a test card, and check it shows as Paid on the order page. Then try closing the tab right after paying, and check the webhook still marks it paid.
5. Switch to live keys.

## Admin panel (Step 4)

Open `/admin` and sign in with an email listed in `ADMIN_EMAILS`, using the same 6-digit email code as shoppers. On your own computer, put `ADMIN_EMAILS=you@example.com` in `.env.local`.

- **Dashboard:** today's orders and sales, the last 7 days, and what needs doing.
- **Orders:** tabs for To confirm (COD), To print, Printing, Shipped, Delivered, Unpaid and Cancelled, with search by number, email, phone or name. Each order has:
  - **Confirm on WhatsApp** for COD orders (opens a chat with a pre-written message), then **Mark confirmed**
  - **Start printing**, **Mark shipped** (courier and tracking number; Delhivery and Shiprocket links are filled in automatically), **Mark delivered**. Delivering a COD order marks the cash as collected
  - **Cancel** with a reason, and **Refund** (through Razorpay when keys are set, otherwise recorded with your reference)
  - **Customer files** for custom items: the untouched originals, print-ready files with the shopper's crop at full resolution, or everything as one zip with a `design.txt`
  - a printable **packing slip** (shows the COD amount to collect) and **receipt**, and a private note
- Customers are emailed automatically when their order ships (with tracking), is delivered, cancelled or refunded. The order and track pages show a **Track parcel** link once it ships.
- **Products:** search by name, web address or id, filter by type, vibe, shown or hidden, and demo or yours. Tick products to show, hide, move to another vibe or delete several at once.
  - **Add or edit a product:** name, type, main vibe and up to four more, description, search words, web address, popularity, and up to 8 photos (drag to upload; the first is the cover). A card preview shows how it will look.
  - **Price:** leave it empty to use the type's price table, or set the product's own starting price; every option then moves by the same amount.
  - Products with photos show them on their page as a gallery (1600 px), and cards use a 480 px version. Product photos are public and cached for a year; customer uploads stay private.
  - **Remove demo products** deletes the 5,910 demo products in one go once your own are in. A demo product you edited counts as yours and stays.
- **CSV import and export** (`/admin/products/import`):
  1. Upload the photos the file mentions. Rows are matched to photos by file name.
  2. Paste the CSV (or text copied from Excel or Google Sheets), or choose the file, and press **Check file**. Each row shows as new, update, unchanged or error, with the reason. Nothing changes until you press **Import**.
  - Columns: `id, slug, name, type, vibes, description, tags, price_from_rupees, popularity, images, active`. Columns you leave out are left as they are. The page explains each one, and **Download template** gives you a file with example rows.
  - **Export** gives the same format, so you can bulk-edit in Excel and import the file back. Importing the same file twice changes nothing the second time.
- **Categories:** each product type's name, description, highlights, visibility and order, and its **price table**: a base price plus the extra for each choice, with a grid where the price depends on another option (like a frame by size). A price check shows what any combination costs. Saving updates every product's starting price. The custom-studio prices are here too.
- **Vibes:** add, rename, describe, feature on the home page and menu, hide, reorder, and delete (only when no product uses it).
- **Coupons:** percent off (with an optional cap), an amount off, or free shipping, each with an optional minimum order, first and last day, total uses and uses per shopper (by email).
  - Shoppers enter the code under **Have a coupon?** at checkout. A code that can't be used says why: expired, not started, used up, already used by this shopper, or how much more to add.
  - The coupon comes after packs and buy-X-get-Y offers and before shipping, as its own line. The online-payment discount applies to the price after it.
  - A use counts when a COD order is placed (refused if the last use just went) or when an online order is paid. Orders show their code, and order search finds orders by code.
  - Used coupons can be switched off but not deleted.
- **Reviews:** when an order is delivered, its page (and the delivered email) asks the buyer to rate each catalog item: 1 to 5 stars, optional text and up to 3 photos. Reviews wait in **Reviews** until you approve them; then the product page shows them with a “Verified buyer” badge, the average and count next to the title, and the rating in the page's search data. Custom-printed items can't be reviewed. Pending reviews show on the dashboard.
- **Customers:** everyone who has ordered, grouped by email: name, phone, orders, amount spent, last order and whether they have an account, with search and a link to their orders.
- **Home page:** the banner's small line, title, text, two buttons and an optional photo, with a preview. Without a photo, the generated artwork shows.
- **Settings:** the announcement bar; free-shipping amount, shipping fee and delivery days; Cash on Delivery (on or off, fee, smallest and largest order, custom items); the online-payment discount; sticker pack sizes and prices; buy-X-get-Y offers; contact details and WhatsApp number; social links for the footer; and the business name, address and GSTIN for receipts. Changes show in the store straight away.

## Going live

[DEPLOY.md](DEPLOY.md) walks through everything, from buying a server in India to the first real order. In short:
- `deploy/setup.sh` prepares an Ubuntu 24.04 server: Node.js, Caddy for HTTPS, the firewall, the service and nightly timers.
- `sudo pyv deploy` builds and switches to new code. The store keeps running the old version if anything fails, and `sudo pyv rollback` goes back.
- Backups go to Cloudflare R2 every night.
- **Admin → Dashboard** lists anything still missing before launch.

## Search engines, sharing, speed and accessibility

- **Search engines:**
  - `/robots.txt` keeps admin, checkout, account and search pages out of search results. A copy running on localhost blocks everything.
  - `/sitemap.xml` lists every shown product, category, vibe and info page.
  - A missing or hidden category, vibe or product returns a real 404 (`src/proxy.ts` checks category and vibe addresses before the page streams).
  - Pages carry canonical links, and structured data: the store and its search on the home page, products, and breadcrumbs.
- **Sharing:** links shared on WhatsApp, Instagram or X show a 1200 × 630 card. A product's card has its photo, name, type and starting price (`src/app/(shop)/p/[slug]/opengraph-image.tsx`). The fonts for these cards are in `src/assets/fonts` (open licence).
- **Phone home screen:** `src/app/manifest.ts` and the icons in `public/` make "Add to home screen" look right.
- **Speed and accessibility (Lighthouse on a phone, on the local production build; Performance varies by a few points from run to run):**

  | Page | Performance | Accessibility | Best practices |
  | --- | --- | --- | --- |
  | Home | 93 | 100 | 100 |
  | Category | 90 | 100 | 100 |
  | Product with photos | 86 to 91 | 100 | 100 |
  | Sticker studio | 95 | 100 | 100 |
  | Checkout | 98 | 100 | 100 |

  The pages were also scanned with axe on desktop and phone, admin pages included, and checked by keyboard: menus, cart drawer, crop dialog and payment window.
- **Security:**
  - Every page is sent with HTTPS-only (HSTS), no-framing, no-sniffing and referrer headers (`next.config.ts`).
  - A test checks that every admin action, page and API route refuses non-admins (`src/lib/admin/access.test.ts`).
  - Friendly error pages cover the shop, the admin and the whole site.

## Project layout

```
src/app/(shop)/          storefront pages (Next.js App Router; the folder name doesn't appear in URLs)
src/app/admin/           admin panel pages
src/app/api/             API routes
src/actions/             server actions (checkout, account, tracking, admin)
src/lib/admin/           admin access checks, orders, customer file downloads, products, CSV import, price tables, vibes
src/components/          UI: layout, product cards, listing filters, product page, cart
src/lib/catalog/         catalog definitions (taxonomy.ts), cached queries, search, filters
src/lib/pricing/         the pricing engine shared by product pages and the cart API
src/lib/art/             generator for the demo products' placeholder artwork
src/lib/custom/          custom studio rules: print sizes, crops, resolution checks, design checks
src/lib/storage/         file storage for uploads (a folder on the server, backed up to Cloudflare R2)
src/components/custom/   the three studios, crop editor, upload queue and wall preview
src/components/pack/     build-your-own pack grid and progress bar
src/components/checkout/ checkout form, address fields, payment window (Razorpay or test)
src/lib/orders/          order service, statuses, COD rules, order numbers, saved addresses
src/lib/payments/        Razorpay orders and signature checks
src/lib/email/           email sending (Resend or the local outbox) and templates
src/lib/auth.ts          sign-in (Better Auth: email codes and Google)
src/lib/db/              database schema and client (Drizzle ORM + libSQL / SQLite)
src/content/pages.ts     text of the info and policy pages
scripts/                 migrate, seed, maintenance, backup and restore commands
deploy/                  server setup, the deploy script, systemd units and the Caddy config
src/lib/backup/          backups to Cloudflare R2, and restoring them
src/lib/seo.ts           robots rules and structured data; src/lib/og.tsx draws the share cards
drizzle/                 database migrations
design/                  theme showcase from Step 0
```

## Things to change before launch

- **Prices:** set your real prices in **Admin → Categories**. The amounts in `src/lib/catalog/taxonomy.ts` are only the starting placeholders.
- **Products:** add your own (one by one or by CSV), then **Remove demo products**.
- **Backups:** the local database runs in write-ahead (WAL) mode, so back up `data/printyourvibe.db` together with its `-wal` file, or use `sqlite3 data/printyourvibe.db ".backup backup.db"`.
- **Go-live checklist:** **Admin → Dashboard** lists what's still missing, with links to fix each one.
- **Store settings:** in **Admin → Settings**, add your support email, WhatsApp number, business address, GSTIN (if you have one), grievance officer, the city for your terms, and your About story, and check shipping, COD and offers. These also fill in the policy pages. `src/lib/settings.ts` only holds the starting defaults.
- **Home page:** set your own banner in **Admin → Home page**.
- **Policy pages:** most placeholders are filled from Settings; anything still highlighted as a [placeholder] is listed on the dashboard. Have the policies reviewed before launch.
- **Uploads:** customer photos are personal data. Keep the `uploads/` folder (or `UPLOADS_DIR`) out of public web folders and include it in your backups.
- **Your designs:** fandom artwork such as F1 team logos, anime characters and movie art is trademarked or copyrighted. Only sell designs you have the rights to.
