# Putting PrintYourVibe online

This guide takes you from nothing to a live store on your own server in India, with HTTPS, payments, emails and nightly backups. It assumes no server experience: copy the commands as they are.

Plan on an afternoon for the first time.

**No domain yet?** You can start on a free Oracle Cloud server with a free DuckDNS address, then move to your own domain later with one command. See [Starting free](#starting-free-oracle-cloud-and-a-duckdns-address).

**You can open before setting up Razorpay, Resend and Cloudflare R2.** Steps 1 to 5 are enough to take Cash on Delivery orders. [Opening before Razorpay, Resend and R2](#opening-before-razorpay-resend-and-r2) explains what works meanwhile. Steps 6 to 8 add online payments, emails and off-server backups whenever you're ready (Razorpay takes a day or two to check your business).

**What you'll end up with:**
- The store runs on a small Ubuntu server.
- Caddy handles HTTPS: it gets and renews the certificate automatically.
- The store restarts by itself if it ever crashes or the server reboots.
- Every night the server tidies up old unpaid orders and unused uploads (3:30 am), then backs up the database (4:00 am): to Cloudflare R2 with the photos once it's set up, and until then as a copy on the server.
- One command, `sudo pyv deploy`, puts new code online. If the new code doesn't build or start, your store keeps running the old version.

## 1. What you need

| What | Where | Rough cost |
| --- | --- | --- |
| A server (VPS) in India: Ubuntu 24.04 LTS, at least 2 GB of memory, 40 GB of disk | Hostinger India, DigitalOcean (Bangalore) or AWS Lightsail (Mumbai) | ₹500 to ₹1,000 a month |
| A domain, like printyourvibe.in | Any registrar (Hostinger, GoDaddy, BigRock, Namecheap…) | ₹800 to ₹1,200 a year |
| Later: a Cloudflare account, for R2 backups | cloudflare.com | Free up to 10 GB |
| Later: a Resend account, for emails | resend.com | Free up to 3,000 emails a month (100 a day) |
| Later: a Razorpay account, with KYC done | razorpay.com | A small fee per online payment (see Razorpay's pricing page) |
| A password manager | Bitwarden, 1Password, Google Password Manager… | Free |

Keep every key and password from this guide in the password manager. You'll need them again if you ever move to a new server.

## 2. Point your domain at the server

1. Create the server with Ubuntu 24.04 and note its **IP address** (four numbers, like `203.0.113.25`).
2. In your domain registrar's DNS settings, add two records:
   - Type **A**, name **@**, value: your server's IP address.
   - Type **A**, name **www**, value: the same IP address.
3. Wait until the domain points at the server. It's usually a few minutes, sometimes a few hours. To check, open a terminal and run `ping yourdomain.in`: it should show your server's IP.

### Starting free: Oracle Cloud and a DuckDNS address

Use this instead of buying a server and a domain right away. Everything else in this guide stays the same.

**A free server (Oracle Cloud "Always Free"):**
1. Sign up at cloud.oracle.com.
   - Choose **India West (Mumbai)** or **India South (Hyderabad)** as your home region. It can't be changed later.
   - Oracle asks for a card to check who you are. Always Free resources aren't charged.
2. Go to **Compute → Instances → Create instance**:
   - **Image:** Canonical Ubuntu 24.04.
   - **Shape:** Ampere, VM.Standard.A1.Flex, with 2 OCPUs and 12 GB of memory. Always Free covers up to 4 OCPUs and 24 GB in total.
   - **Networking:** keep "Assign a public IPv4 address" on.
   - **SSH keys:** choose "Generate a key pair for me" and download the private key. Keep it in your password manager: it's the only way into the server.
   - If it says "out of capacity", try again later, or pick another availability domain.
3. Open the web ports in Oracle's network firewall:
   - Open the instance, click its **subnet**, then its **Security List**, then **Add Ingress Rules**.
   - Add source `0.0.0.0/0`, protocol TCP, destination port `80`. Add the same again for port `443`.
   - (The setup script opens the server's own firewall.)
4. Copy the instance's **public IP address**.

**A free address (DuckDNS):**
1. Go to duckdns.org and sign in with Google or GitHub.
2. Type a name, like `printyourvibe`, and click **add domain**.
3. In **current ip**, paste the server's IP and click **update ip**.
4. Your store's address is now `printyourvibe.duckdns.org`. Check it with `ping printyourvibe.duckdns.org`.

Then carry on with step 3:
- Connect with the key you downloaded. On a Mac, run `chmod 600` on the key file first.

```bash
ssh -i oracle-key.key ubuntu@203.0.113.25
```

- Use your DuckDNS address in the setup:

```bash
sudo bash deploy/setup.sh printyourvibe.duckdns.org
```

When you buy your domain, see [Moving to your own domain](#moving-to-your-own-domain).

> **Good to know:** Oracle can reclaim Always Free servers that stay almost idle for a week, and a new store with few visitors can look idle. Upgrading the account to **Pay As You Go** stops that, and the Always Free resources stay free. Either way, keep downloading a backup every week (step 5).

## 3. Set up the server

Connect to the server. On Windows use PowerShell; on a Mac use Terminal. Use the username your provider gives: `root` on most, `ubuntu` on AWS Lightsail and Oracle Cloud.

```bash
ssh root@203.0.113.25
```

Get the code. The repository is private, so GitHub asks for your username and a **personal access token** instead of a password:
1. GitHub → Settings → Developer settings → Fine-grained tokens.
2. Give it access only to this repository, with "Contents: Read-only".
3. You can delete the token once this step is done.

```bash
git clone https://github.com/amartyyaaa/stickerwebsite.git
```

```bash
cd stickerwebsite
```

Run the setup with your domain. It takes about five minutes.

```bash
sudo bash deploy/setup.sh printyourvibe.in
```

Deploys use the `main` branch. If your code is still on another branch, add its name at the end, like `sudo bash deploy/setup.sh printyourvibe.in my-branch`. To change the branch later, edit `/srv/printyourvibe/deploy.conf`.

Partway through, the script shows a **deploy key** (a line starting with `ssh-ed25519`). It lets the server fetch new code from GitHub, read-only:
1. On GitHub, open your repository → Settings → Deploy keys → Add deploy key.
2. Paste the key, name it "printyourvibe-server", and leave "Allow write access" unticked.
3. Go back to the terminal and press Enter.

The script also creates your settings file, with your web address and a new sign-in secret already filled in.

## 4. Fill in your settings

```bash
sudo pyv settings
```

This opens `/srv/printyourvibe/shared/.env.production` in a simple editor. Save with Ctrl+O then Enter, and exit with Ctrl+X.

| Setting | What to put | From |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.in` (already filled in) | |
| `BETTER_AUTH_SECRET` | already filled in with a random secret; keep it | |
| `ADMIN_EMAILS` | your email, and anyone else who runs the shop, comma-separated | |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | later: your Razorpay keys | step 6 |
| `RESEND_API_KEY`, `MAIL_FROM` | later: your Resend key, and an address on your domain | step 7 |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | later: your backup bucket | step 8 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional "Continue with Google" | Google Cloud |

Leave the Razorpay, Resend and R2 lines empty until you set them up. Never set `PAYMENTS_MOCK` here; it's only for testing on your own computer.

**When you change settings later:**
- For most settings, restart the store with `sudo pyv restart`.
- If you change `NEXT_PUBLIC_SITE_URL`, run `sudo pyv deploy` instead (it rebuilds the site).

Save a copy of the finished file in your password manager.

## 5. Put the store online

```bash
sudo pyv deploy
```

The first time takes three to five minutes. Then open `https://yourdomain.in`. The very first visit can take a few seconds while Caddy gets the HTTPS certificate.

**First sign-in:**
1. Open `https://yourdomain.in/admin`, enter an email from `ADMIN_EMAILS` and click **Email me a code**.
2. The code arrives by email once step 7 is done. Until then, it's saved on the server, and this command shows it:

```bash
sudo pyv code
```

3. Codes work for 5 minutes, and you stay signed in for 30 days.

The live store starts with your product types and vibes but no products.
- Add your own in **Admin → Products**, one by one or with a CSV file.
- If you'd like to see the store full of demo designs first:

```bash
cd /srv/printyourvibe/current && sudo -u pyv npm run db:seed -- sample
```

Remove them later with the **Remove demo products** button on the Products page.

### Opening before Razorpay, Resend and R2

The store works without them, with these limits:

- **Payments:** shoppers pay Cash on Delivery only. Until Razorpay is set up:
  - COD has no smallest order, and custom prints can use it too.
  - Confirm every COD order on WhatsApp before printing, especially custom prints: **Admin → Orders → To confirm** has a WhatsApp button on each order.
  - Pages say "Cash on Delivery" instead of "UPI, cards & COD".
  - Your COD settings (smallest order, custom prints) apply again once you add Razorpay.
- **Emails:** nothing is emailed yet.
  - Shoppers can't make accounts. They check orders on **Track order** with their order number and phone, and the order page asks them to note the number.
  - You don't get new-order emails: check **Admin → Dashboard** (it lists COD orders to confirm) at least once a day.
  - Get your admin sign-in code with `sudo pyv code`.
  - Saved emails are deleted after 14 days.
- **Backups:** each night the database is copied to `/srv/printyourvibe/shared/data/backups`, and the last 14 days are kept. These copies undo mistakes, like a bad import, but they're on the same server.
  - Use **Download a backup** on the dashboard every week and keep the file on your computer.
  - It holds orders, products and settings. Photos stay on the server until R2 is set up.

**Admin → Dashboard** lists these under "Later". Add each one when you're ready, with steps 6, 7 and 8.

## 6. Razorpay (when you're ready)

1. In the Razorpay dashboard, switch to **Test mode** and create API keys (Account & Settings → API keys). Put them in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
2. Turn on **automatic capture** (Account & Settings → Payment capture).
3. Add a webhook (Account & Settings → Webhooks):
   - URL: `https://yourdomain.in/api/payments/razorpay/webhook`
   - Events: `payment.captured`, `order.paid` and `payment.failed`
   - Choose a secret and put it in `RAZORPAY_WEBHOOK_SECRET`.
4. Run `sudo pyv deploy` (not just restart: it rebuilds the pages so they mention UPI and cards). Place a test order with Razorpay's test card or test UPI ID and check it shows as Paid. Also try closing the tab right after paying: the webhook should still mark the order paid.
5. Once your KYC is approved, switch to **Live mode** and repeat steps 1 to 3 with the live keys and a live webhook. Then run `sudo pyv restart`.
6. Check **Admin → Settings → Cash on Delivery**: your smallest order and the custom-prints switch apply again now.

Razorpay also checks that your site has About, Contact, Shipping, Returns, Privacy and Terms pages. These are in the footer. Fill in the details they need in **Admin → Settings** (step 9).

## 7. Emails (Resend, when you're ready)

1. Sign up at resend.com and add your domain (Domains → Add domain).
2. Resend shows a few DNS records (TXT and MX). Add them where you added the A records in step 2, then click **Verify** in Resend. It can take up to an hour.
3. Create an API key (API Keys → Create) and put it in `RESEND_API_KEY`.
4. Set `MAIL_FROM` to an address on that domain, like `PrintYourVibe <orders@yourdomain.in>`.
5. Run `sudo pyv deploy` (it rebuilds the pages so shoppers can sign in), then sign in to the admin again: the code should arrive by email.

New-order alerts go to the support email in **Admin → Settings**, or to `ORDER_ALERT_EMAIL` if you set it.

## 8. Backups off the server (Cloudflare R2, when you're ready)

1. In Cloudflare, open **R2** and create a bucket, like `printyourvibe-backups` (location: Asia-Pacific).
2. Create a key for it: R2 → Manage API tokens → Create API token.
   - Permission: **Object Read & Write**, for that bucket only.
   - Copy the **Access Key ID** and **Secret Access Key** into `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`.
   - Your **Account ID** is on the R2 overview page; it goes in `R2_ACCOUNT_ID`.
   - The bucket name goes in `R2_BUCKET`.
3. Run `sudo pyv restart`, then the first backup:

```bash
sudo pyv backup
```

It saves the database as `db/<date>.sqlite.gz` and copies every photo into `uploads/`.
- After that it runs every night at 4 am.
- It keeps the last 30 days and one backup a month for a year.
- Photos are only copied once.
- **Admin → Dashboard** shows when the last backup ran.

The settings file isn't backed up, because it holds secrets. That's why it belongs in your password manager.

### If the server is ever lost

**With R2 set up:**
1. Create a new server and point the domain at it (step 2).
2. Run the setup (step 3).
3. Put back your settings file from the password manager (step 4).
4. Run `sudo pyv deploy` (step 5).
5. Bring everything back:

```bash
sudo pyv restore --force
```

The store stops while the backup is restored, then starts again. `--force` replaces the empty database the new server started with; the old one is kept as a copy next to it.

Other ways to restore:
- `sudo pyv restore --force --from 2026-11-01` brings back an older backup.
- `sudo pyv restore --photos-only` only downloads missing photos.

**Before R2 is set up:** do steps 1 to 4 above, then bring back the last backup you downloaded.
1. Copy it from your computer to the server (in PowerShell or Terminal):

```bash
scp printyourvibe-2026-11-08-1030.sqlite.gz root@203.0.113.25:/root/
```

2. Then, on the server:

```bash
sudo pyv restore --force --file /root/printyourvibe-2026-11-08-1030.sqlite.gz
```

Orders, products and settings come back. Photos don't: upload product photos again, and ask customers with open custom orders to send their photos again.

To undo a mistake on a running server (a bad import, deleted products), bring back last night's copy: `sudo pyv restore --force --local` (or `--local --from 2026-11-01` for an older one). The current database is kept as a copy next to it.

## 9. Before you announce the launch

Open **Admin → Dashboard**. The **Before you go live** list shows what's still missing, with a link to fix each one:
- support email and WhatsApp number
- business name and address
- a grievance officer (Indian e-commerce rules require one)
- policy pages with no `[placeholders]` left
- your own products in, and demo products removed
- backups and the nightly clean-up running

Online payments, emails and off-server backups appear under **Later**: the store can open without them.

Then place one real order with a small amount and walk it through **Admin → Orders**: Cash on Delivery for now, or a UPI payment and a refund once Razorpay is set up.

## Moving to your own domain

When you started on a free DuckDNS address (or want to change domain later):
1. Buy the domain and add its two A records, pointing at your server's IP (step 2).
2. Wait until `ping yourdomain.in` shows the server's IP.
3. Run this, with your domain. It takes about 5 minutes, because it rebuilds the site for the new address:

```bash
sudo pyv domain printyourvibe.in
```

4. Sign in again at `https://printyourvibe.in/admin`.

Links to the old address keep working: they redirect to the new domain. Keep the DuckDNS name pointing at the server for a few months, so links people saved still work.

## Day to day

| Command | What it does |
| --- | --- |
| `sudo pyv deploy` | Put the latest code from GitHub online. It builds first; if anything fails, the store keeps running the old version. |
| `sudo pyv rollback` | Go back to the previous version (the last five are kept). |
| `sudo pyv status` | Is the store up, which version is running, and when do the nightly jobs run next? |
| `sudo pyv logs` | Follow the store's log (Ctrl+C to stop). |
| `sudo pyv settings` | Edit the settings file. Then run `sudo pyv restart`. |
| `sudo pyv code` | Show the newest admin sign-in code (until emails are set up). |
| `sudo pyv domain yourdomain.in` | Move the store to a new domain; the old address redirects there. |
| `sudo pyv backup` | Back up right now (to R2, or a copy on the server until R2 is set up). |
| `sudo pyv maintenance` | Run the nightly clean-up right now. |

**Keeping an eye on it:** create a free monitor at uptimerobot.com for `https://yourdomain.in/api/health` (keyword `"ok":true`). It emails you if the store goes down.

**Updates:** Ubuntu installs security updates by itself. If you log in and see "System restart required", run `sudo reboot`. The store starts again on its own.

**Disk space:** customer photos and print files live on the server. Check space with `df -h /`; when it passes about 80%, move to a bigger disk or plan.

## Troubleshooting

- **The site doesn't open:**
  - Check the domain points at the server (`ping yourdomain.in`).
  - Check Caddy: `sudo journalctl -u caddy -n 50`.
  - It can't get a certificate until the domain points at this server.
- **A deploy stopped:** read the line that starts with "Deploy stopped". Your store kept running the previous version, so you can fix the problem and run `sudo pyv deploy` again.
- **The build ran out of memory:** the setup adds 2 GB of swap on small servers. If it still fails, move to a plan with more memory.
- **No emails:** until step 7 is done, nothing is emailed (that's expected; use `sudo pyv code` to sign in). After it, check the domain is verified in Resend and look at Resend's Logs page.
- **A payment isn't marked paid:** check the webhook URL and secret in Razorpay match step 6.
- **The admin says "No access":** make sure your email is in `ADMIN_EMAILS`, then run `sudo pyv restart`.

## Other hosts

The store is a standard Node.js app, so it can run on any host with Node.js 22 and a disk that keeps its files (Railway, Render or Fly.io). There, the nightly jobs need the host's own scheduler to run `npm run maintenance` and `npm run backup`. This guide and the `deploy/` scripts cover an Ubuntu server only.
