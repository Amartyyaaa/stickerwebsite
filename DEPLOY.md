# Putting PrintYourVibe online

This guide takes you from nothing to a live store on your own server in India, with HTTPS, payments, emails and nightly backups. It assumes no server experience: copy the commands as they are.

Plan on an afternoon for the first time, plus a day or two of waiting for Razorpay to check your business (KYC).

**What you'll end up with:**
- The store runs on a small Ubuntu server.
- Caddy handles HTTPS: it gets and renews the certificate automatically.
- The store restarts by itself if it ever crashes or the server reboots.
- Every night the server tidies up old unpaid orders and unused uploads (3:30 am), then backs up the database and photos to Cloudflare R2 (4:00 am).
- One command, `sudo pyv deploy`, puts new code online. If the new code doesn't build or start, your store keeps running the old version.

## 1. What you need

| What | Where | Rough cost |
| --- | --- | --- |
| A server (VPS) in India: Ubuntu 24.04 LTS, at least 2 GB of memory, 40 GB of disk | Hostinger India, DigitalOcean (Bangalore) or AWS Lightsail (Mumbai) | ₹500 to ₹1,000 a month |
| A domain, like printyourvibe.in | Any registrar (Hostinger, GoDaddy, BigRock, Namecheap…) | ₹800 to ₹1,200 a year |
| A Cloudflare account, for R2 backups | cloudflare.com | Free up to 10 GB |
| A Resend account, for emails | resend.com | Free up to 3,000 emails a month (100 a day) |
| A Razorpay account, with KYC done | razorpay.com | A small fee per online payment (see Razorpay's pricing page) |
| A password manager | Bitwarden, 1Password, Google Password Manager… | Free |

Keep every key and password from this guide in the password manager. You'll need them again if you ever move to a new server.

## 2. Point your domain at the server

1. Create the server with Ubuntu 24.04 and note its **IP address** (four numbers, like `203.0.113.25`).
2. In your domain registrar's DNS settings, add two records:
   - Type **A**, name **@**, value: your server's IP address.
   - Type **A**, name **www**, value: the same IP address.
3. Wait until the domain points at the server. It's usually a few minutes, sometimes a few hours. To check, open a terminal and run `ping yourdomain.in`: it should show your server's IP.

## 3. Set up the server

Connect to the server. On Windows use PowerShell; on a Mac use Terminal. Use the username your provider gives: `root` on most, `ubuntu` on AWS Lightsail.

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
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | your Razorpay keys | step 6 |
| `RESEND_API_KEY`, `MAIL_FROM` | your Resend key, and an address on your domain | step 7 |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | your backup bucket | step 8 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional "Continue with Google" | Google Cloud |

You can fill in Razorpay, Resend and R2 later. Never set `PAYMENTS_MOCK` here; it's only for testing on your own computer.

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
1. Open `https://yourdomain.in/admin` and sign in with an email from `ADMIN_EMAILS`.
2. The code arrives by email once step 7 is done. Until then, it's saved on the server, and this command shows the newest saved email, code included:

```bash
sudo bash -c 'cat "$(ls -t /srv/printyourvibe/shared/data/outbox/*.json | head -1)"'
```

The live store starts with your product types and vibes but no products.
- Add your own in **Admin → Products**, one by one or with a CSV file.
- If you'd like to see the store full of demo designs first:

```bash
cd /srv/printyourvibe/current && sudo -u pyv npm run db:seed -- sample
```

Remove them later with the **Remove demo products** button on the Products page.

## 6. Razorpay

1. In the Razorpay dashboard, switch to **Test mode** and create API keys (Account & Settings → API keys). Put them in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
2. Turn on **automatic capture** (Account & Settings → Payment capture).
3. Add a webhook (Account & Settings → Webhooks):
   - URL: `https://yourdomain.in/api/payments/razorpay/webhook`
   - Events: `payment.captured`, `order.paid` and `payment.failed`
   - Choose a secret and put it in `RAZORPAY_WEBHOOK_SECRET`.
4. Run `sudo pyv restart`. Place a test order with Razorpay's test card or test UPI ID and check it shows as Paid. Also try closing the tab right after paying: the webhook should still mark the order paid.
5. Once your KYC is approved, switch to **Live mode** and repeat steps 1 to 3 with the live keys and a live webhook. Then run `sudo pyv restart`.

Razorpay also checks that your site has About, Contact, Shipping, Returns, Privacy and Terms pages. These are in the footer. Fill in the details they need in **Admin → Settings** (step 9).

## 7. Emails (Resend)

1. Sign up at resend.com and add your domain (Domains → Add domain).
2. Resend shows a few DNS records (TXT and MX). Add them where you added the A records in step 2, then click **Verify** in Resend. It can take up to an hour.
3. Create an API key (API Keys → Create) and put it in `RESEND_API_KEY`.
4. Set `MAIL_FROM` to an address on that domain, like `PrintYourVibe <orders@yourdomain.in>`.
5. Run `sudo pyv restart`, then sign in to the admin again: the code should arrive by email.

New-order alerts go to the support email in **Admin → Settings**, or to `ORDER_ALERT_EMAIL` if you set it.

## 8. Backups (Cloudflare R2)

1. In Cloudflare, open **R2** and create a bucket, like `printyourvibe-backups` (location: Asia-Pacific).
2. Create a key for it: R2 → Manage API tokens → Create API token.
   - Permission: **Object Read & Write**, for that bucket only.
   - Copy the **Access Key ID** and **Secret Access Key** into `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`.
   - Your **Account ID** is on the R2 overview page; it goes in `R2_ACCOUNT_ID`.
   - The bucket name goes in `R2_BUCKET`.
3. Run the first backup now:

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

## 9. Before you announce the launch

Open **Admin → Dashboard**. The **Before you go live** list shows what's still missing, with a link to fix each one:
- live payments and the webhook
- emails
- support email and WhatsApp number
- business name and address
- a grievance officer (Indian e-commerce rules require one)
- policy pages with no `[placeholders]` left
- your own products in, and demo products removed
- backups and the nightly clean-up running

Then place one real order with a small amount, pay with UPI, and refund it from **Admin → Orders**.

## Day to day

| Command | What it does |
| --- | --- |
| `sudo pyv deploy` | Put the latest code from GitHub online. It builds first; if anything fails, the store keeps running the old version. |
| `sudo pyv rollback` | Go back to the previous version (the last five are kept). |
| `sudo pyv status` | Is the store up, which version is running, and when do the nightly jobs run next? |
| `sudo pyv logs` | Follow the store's log (Ctrl+C to stop). |
| `sudo pyv settings` | Edit the settings file. Then run `sudo pyv restart`. |
| `sudo pyv backup` | Back up right now. |
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
- **No emails:** check the domain is verified in Resend and look at Resend's Logs page.
- **A payment isn't marked paid:** check the webhook URL and secret in Razorpay match step 6.
- **The admin says "No access":** make sure your email is in `ADMIN_EMAILS`, then run `sudo pyv restart`.

## Other hosts

The store is a standard Node.js app, so it can run on any host with Node.js 22 and a disk that keeps its files (Railway, Render or Fly.io). There, the nightly jobs need the host's own scheduler to run `npm run maintenance` and `npm run backup`. This guide and the `deploy/` scripts cover an Ubuntu server only.
