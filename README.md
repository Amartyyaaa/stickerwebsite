# PrintYourVibe

An online store for custom-printed stickers (2D and 3D), polaroids, wall posters, and laptop, fridge and diary stickers. It's built for India: prices in ₹, online payments through Razorpay (UPI, cards, netbanking) and Cash on Delivery. The store uses the **Midnight Neon** theme.

## Status

| Step | What | State |
| --- | --- | --- |
| 0 | Pick a theme (`design/theme-showcase.html`) | Done: Midnight Neon |
| 1 | Storefront: catalog, listings, search, product pages, cart | Done |
| 2 | Custom studio and build-your-own sticker packs | Done |
| 3 | Accounts, checkout, Razorpay and Cash on Delivery | **Done** |
| 4 | Admin panel, including bulk CSV import | Next |
| 5 | Launch readiness and the deployment guide | Planned |

## Run it on your computer

You need Node.js 22 or newer.

```bash
npm install
npm run db:setup   # creates data/printyourvibe.db with 24 product types, 3 custom-studio types, 30 vibes and 5,910 demo products
npm run dev        # open http://localhost:3000
```

Local development needs no accounts or settings. The database is a single file in `data/`, and images uploaded in the custom studio go to `uploads/`.

Already set up from an earlier step? Run `npm run db:migrate` and `npm run db:seed` to add the new tables and product types. Your products and orders aren't touched.

In development, emails (sign-in codes, order confirmations) are saved as files in `data/outbox/` instead of being sent, and online payments open a test screen. See `.env.example` for the keys the live site needs.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Unit tests (pricing, sticker packs, shipping, COD, crops and print resolution) |
| `npm run lint` / `npm run typecheck` | Code checks |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Write product types, vibes and store settings (`-- sample` adds demo products, `-- clear` removes them) |
| `npm run maintenance` | Daily housekeeping: cancels unpaid online orders after 24 hours and deletes unused uploads after 7 days. Run it once a day on the server |

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

## Project layout

```
src/app/                 pages and API routes (Next.js App Router)
src/components/          UI: layout, product cards, listing filters, product page, cart
src/lib/catalog/         catalog definitions (taxonomy.ts), cached queries, search, filters
src/lib/pricing/         the pricing engine shared by product pages and the cart API
src/lib/art/             generator for the demo products' placeholder artwork
src/lib/custom/          custom studio rules: print sizes, crops, resolution checks, design checks
src/lib/storage/         file storage for uploads (local folder now, Cloudflare R2 in Step 5)
src/components/custom/   the three studios, crop editor, upload queue and wall preview
src/components/pack/     build-your-own pack grid and progress bar
src/components/checkout/ checkout form, address fields, payment window (Razorpay or test)
src/lib/orders/          order service, statuses, COD rules, order numbers, saved addresses
src/lib/payments/        Razorpay orders and signature checks
src/lib/email/           email sending (Resend or the local outbox) and templates
src/lib/auth.ts          sign-in (Better Auth: email codes and Google)
src/lib/db/              database schema and client (Drizzle ORM + libSQL / SQLite)
src/content/pages.ts     text of the info and policy pages
scripts/                 migrate and seed scripts
drizzle/                 database migrations
design/                  theme showcase from Step 0
```

## Things to change before launch

- **Prices:** set real prices in `src/lib/catalog/taxonomy.ts` for now. They become editable in the admin panel in Step 4.
- **Store settings:** shipping, COD, offers and contact details are in the database (`src/lib/settings.ts` holds the defaults).
- **Policy pages:** replace every highlighted [placeholder] in `src/content/pages.ts`, and have the policies reviewed. This includes how long you keep customer uploads.
- **Uploads:** customer photos are personal data. Keep the `uploads/` folder (or `UPLOADS_DIR`) out of public web folders and include it in your backups.
- **Your designs:** fandom artwork such as F1 team logos, anime characters and movie art is trademarked or copyrighted. Only sell designs you have the rights to.
