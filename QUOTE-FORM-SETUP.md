# Quote form: what must be set up before it works live

The form on /disney/ posts to `/api/quote`, a small Worker (`src/worker.js`) that
runs in front of the static site. It checks the input, then emails the request
to **vacation@near-disney.com** through **Cloudflare Email Service** (the
`send_email` binding `QUOTE_EMAIL` in `wrangler.jsonc`). The guest's address is
set as Reply-To, so pressing Reply answers the guest. The site does not need
a mail app on the guest's phone.

Nothing on this branch has been deployed, pushed, or configured on Cloudflare.

## Why this approach
- The site is already a Cloudflare Worker with static assets (`wrangler.jsonc`,
  no build step), so a Worker route is the smallest change. It needs no new
  vendor, account or API key.
- **Cloudflare Email Routing can't be used.** near-disney.com mail is handled by
  Proofpoint/Microsoft 365 (MX `mx1-3-usg2.ppe-hosted.com`). Email Routing would
  replace those MX records and break the current inbox. **Email Sending** only
  adds records on the `cf-bounce.` subdomain, so it leaves the inbox alone.

## Steps for BWhitty (in this order, before merging to main)
1. Cloudflare dashboard > Compute > Email Service > **Email Sending** >
   Onboard Domain > near-disney.com. Review the records it proposes:
   - MX / SPF TXT / DKIM TXT on `cf-bounce.near-disney.com`: fine, new subdomain.
   - **DMARC on `_dmarc.near-disney.com`: there is already one**
     (`v=DMARC1; p=none; rua=mailto:vacation@near-disney.com`). Keep the existing
     record. Don't let it be replaced with `p=reject`, because that could start
     bouncing MailerLite or Microsoft 365 mail that isn't aligned.
   - Root MX and root SPF must **not** change.
2. Check the plan and pricing. Email Sending may require the Workers Paid
   plan or have a monthly quota. Form volume is tiny either way.
3. Optional but recommended: verify vacation@near-disney.com as a destination
   address. Mail to verified addresses is free and works even before
   onboarding finishes.
4. Optional extra spam protection: create a Turnstile widget, add
   `TURNSTILE_SECRET` as a Worker secret (`wrangler secret put TURNSTILE_SECRET`)
   and add the widget script and site key to the form. The Worker already checks
   Turnstile when that secret exists. Without it, the honeypot and timing trap
   still apply.
5. Approve the merge to main, which auto-deploys. Workers Builds will deploy the
   Worker plus binding. If step 1 isn't done, the deploy or the sends will fail,
   and the form will show "please WhatsApp or email us".
6. Send one test request from a phone and confirm it lands in
   vacation@near-disney.com (and isn't sitting in Proofpoint quarantine). If it's
   quarantined, allow-list `quotes@near-disney.com` in Proofpoint.

## Spam and validation
- Hidden honeypot field `website`: if it's filled, the Worker reports success but
  sends nothing.
- Timing trap: forms submitted less than 3 s after the page loads are dropped.
- Same-origin check and a 10 KB size cap.
- Server-side checks: valid dates, check-out after check-in, at most 60 nights,
  at most 2 years ahead, guests 1–10 (plus an 11th-guest/infant checkbox),
  pool heat yes/no, name 2–100 characters, valid email, message up to 1,000
  characters.
- The email can only go to vacation@near-disney.com (`destination_address`).

## Works without JavaScript
A plain POST gets a 303 redirect back to `/disney/?quote=sent#quote`. With JS, it
sends in the background and shows the result inline.

## Local test
`wrangler dev --local` uses a simulated send_email (nothing is sent). This was
tested on the box: a valid request writes the email to `.wrangler/tmp/email/`,
and invalid, honeypot and GET requests are rejected.
