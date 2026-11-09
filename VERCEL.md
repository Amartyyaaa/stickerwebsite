# A free preview on Vercel

Put the store online for free, to show people and try everything out. It takes about 20 minutes, all in your browser.

**Before you start, know that:**
- Vercel's free plan (Hobby) is for **non-commercial use**. For real sales, move to a server ([DEPLOY.md](DEPLOY.md), about ₹400–1,000 a month) or Vercel's Pro plan.
- The store uses three free services, all of which you sign into with GitHub:
  - **Vercel** runs the website.
  - **Turso** holds the database: products, orders and settings.
  - **Vercel Blob** keeps photos. It's part of your Vercel project.

## 1. Get the code into `main`

Vercel publishes the `main` branch, so this guide's changes need to be there first. On GitHub, open [pull request #2](https://github.com/Amartyyaaa/stickerwebsite/pull/2), click **Merge pull request**, then **Confirm merge**.

## 2. Create the database (Turso)

1. Go to turso.tech and sign up with GitHub.
2. Click **Create Database**:
   - **Name:** `printyourvibe`.
   - **Location:** **Mumbai** (AWS ap-south-1), close to your shoppers.
3. Open the database and copy its **URL**. It starts with `libsql://`.
4. Click **Create Token** (read and write, no expiry) and copy the token. Keep both in your password manager.

## 3. Create the Vercel project

1. Sign in at vercel.com with GitHub. If you don't have an account yet, click **Sign Up**, then **Continue with GitHub**, and choose the free **Hobby** plan.
2. On the dashboard, click **Create New** (top right), then **Project**. Find `stickerwebsite` and click **Import**.
   - If it isn't listed, click **Adjust GitHub App Permissions** and add `stickerwebsite` to the repositories Vercel can see. If you've used Vercel before, it may only have access to your other repositories.
3. Leave the build settings as they are. Open **Environment Variables** and add:

| Name | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | the `libsql://…` URL from step 2 |
| `TURSO_AUTH_TOKEN` | the token from step 2 |
| `BETTER_AUTH_SECRET` | a random 40-character password (use your password manager's generator) |
| `ADMIN_EMAILS` | your email address |
| `CRON_SECRET` | another random 40-character password |
| `SEED_SAMPLE` | `1` if you'd like the 5,910 demo designs to start with (added once; remove them later in **Admin → Products**) |

4. Click **Deploy**.
   - It builds for 3–5 minutes.
   - Then the project page shows your address, like `https://stickerwebsite.vercel.app`.
   - The first version isn't fully working yet; steps 4 and 5 finish the setup.

## 4. Add photo storage (Vercel Blob)

1. In the project, open **Storage → Create → Blob**, name it `printyourvibe-photos`, and **Connect** it to the project for all environments.
2. Check **Settings → Environment Variables**: there should be a `BLOB_READ_WRITE_TOKEN`. If there isn't, open the Blob store, copy its read-write token, and add it under that name.

## 5. Tell the store its address, and publish again

1. In **Settings → Environment Variables**, add `NEXT_PUBLIC_SITE_URL` with your address from step 3, like `https://stickerwebsite.vercel.app`. Use no `/` at the end.
2. Open **Deployments**, click **…** on the newest one, then **Redeploy**. Wait for it to finish.

Your store is online at that address.

## 6. Sign in to the admin

1. Open `https://your-address.vercel.app/admin`, enter the email from `ADMIN_EMAILS`, and click **Email me a code**.
2. No emails are sent yet, so the code goes to your project's log:
   - In Vercel, open your project and then **Logs**.
   - Search for `sign-in` and look for the line **[sign-in] Code for you@…: 123456**.
3. Type the code within 5 minutes. You stay signed in for 30 days.

Then work through the dashboard's **Before you go live** list:
- **Settings:** your WhatsApp number, support email, business details and grievance officer.
- **Categories:** your prices.
- **Products:** your designs, each with a photo.
- **Home page:** your banner.

## What works, and what waits

- **Shopping:** browsing, search, the custom studio (photos up to 25 MB), the cart and Cash on Delivery orders all work.
- **Orders:** you manage them in **Admin → Orders**. Check the dashboard daily: no emails go out yet, so new orders only show there. Shoppers track their orders with the order number and their phone number.
- **Clean-up:** it runs once a day by itself (Vercel Cron), cancelling unpaid orders and deleting unused uploads.
- **Backups:** Turso keeps backups of the database, and Blob keeps the photos.
- **Online payments and emails:** add Razorpay and Resend later, with the same settings as [DEPLOY.md](DEPLOY.md) steps 6 and 7, in **Settings → Environment Variables**. Then **Redeploy**.
- **Preview links:** sign-in only works on your main address. It doesn't work on Vercel's per-branch preview links.

## Your own domain, later

1. In the project, open **Settings → Domains**, add `yourdomain.in`, and add the DNS records Vercel shows at your domain seller.
2. Change `NEXT_PUBLIC_SITE_URL` to `https://yourdomain.in`, then **Redeploy**.
3. Sign in again on the new address.

## Moving to your own server, later

When you're ready for real sales on a server ([DEPLOY.md](DEPLOY.md)), the products, orders and photos need copying out of Turso and Blob. Ask for an export command at that point; it's a small addition.
