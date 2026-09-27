# My Thrift .com migration — staged rollout

Status at 25 September 2026: prepared and preview-tested; production cutover is NOT complete. The user has explicitly paused publishing and chosen the normal Git-to-Vercel workflow for the eventual release. Do not push a deployment-connected branch or deploy directly until asked to resume publishing.

## Intended routing

| Address | Purpose |
| --- | --- |
| `app.shopmythrift.com` | React marketplace app |
| `shopmythrift.com/product/:id` | Next.js product preview; normal browser redirects to matching app route |
| `shopmythrift.com/:vendorSlug` | Next.js vendor preview; resolves slug to vendor ID before redirecting |
| `shopmythrift.com/store/:vendorId` | Vendor fallback share route |
| `shopmythrift.com/` | Temporary redirect to the app; informational website is deferred |

Keep existing `.store`, `www.shopmythrift.store`, `mx.shopmythrift.store`, mail records and existing deployments. No user data/schema migration is required. Payment/delivery/search API hosts and email sender addresses are not part of this migration.

## Completed

- Created the `.com` zone on Cloudflare Free and retained all eight scanned DNS records: apex A, www CNAME, five mail-forwarding MX records and SPF TXT. Apex/www remain DNS-only.
- Changed only `.com` nameservers at Namecheap to `fred.ns.cloudflare.com` and `nadia.ns.cloudflare.com`; saved values verified. DNS lookup returns those nameservers. Cloudflare's dashboard was still waiting for activation at the last check.
- Added opt-in frontend, Next.js and Cloud Functions URL helpers. Without activation variables, existing URLs remain the defaults.
- Updated relevant app shares, email/action links, payment sharing and native link recognition. Added new Android hosts without removing old hosts.
- Kept query parameters when rich links redirect. Added no-store/User-Agent variance to avoid serving a cached browser redirect to a preview crawler (or vice versa).
- Limited publicly serialized Next preview data to public product/vendor metadata. Previously, full Firestore documents were serialized into preview HTML.
- Built React with both legacy and new-domain configuration. Built Next locally and on Vercel.
- Deployed a PREVIEW to existing Next project `mythriftnextjs`: `https://mythriftnextjs-42659c5oo-timadewale1s-projects.vercel.app` (deployment `dpl_4nSpKPTWLcdnGVjPVh9uuGTY3A9P`). Browser redirect and crawler metadata were verified there.
- Passed 13 frontend/Next URL tests and 20 backend regression tests, including payment checkout, signup, question and email modules. Backend tests also passed with migration configuration enabled.
- Added and verified all three approved Firebase Authentication authorized domains: `app.shopmythrift.com`, `shopmythrift.com`, `www.shopmythrift.com`. The existing six entries (Firebase defaults, localhost, 127.0.0.1, `.store` and `www.store`) were retained. The previously empty settings table loaded correctly after refreshing the console.
- Rechecked local environment files: no migration activation settings are enabled. Existing development/mobile builds therefore continue generating legacy URLs unless explicitly built with new-domain variables. Reran the combined frontend, Next and backend URL suites: 18 tests passed.

## Not completed / decisions pending

1. Publishing is on hold. User approved keeping `.store` available and wants the eventual release through Git -> Vercel, not a direct CLI production deployment. Existing `mythrift` production is from May, while local source includes subsequent app work. Before any push, choose the branch/project arrangement that preserves the old deployment; both existing Vercel projects are connected to the repository. Do not silently promote unrelated local changes or trigger the old production project.
2. Firebase Authentication domain authorization is complete. Actual sign-in, verification/reset links, OAuth popup returns and app action continuation still need testing on the deployed `.com` origin; adding domains alone does not establish end-to-end correctness.
3. Verify Cloudflare zone activation; attach `.com`/www to Next and `app` to the chosen SPA deployment. Read the actual Vercel DNS targets and then update ONLY the new zone's web records, retaining the mail records. At this checkpoint, no `.com` Vercel domains have been attached and web DNS still has the imported parking values.
4. Configure and test SPA route fallback for direct product, store, auth, payment and chat links. Preserve existing security headers and static assets. Make robots/sitemap targets match the deployment; the checked-in robots file currently references the old sitemap.
5. Verify TLS on all new hosts, authentication/reCAPTCHA allowed domains and any Maps referrer restrictions that apply. Do not weaken authentication/App Check to bypass a migration error.
6. Set persistent activation variables, deploy and verify on the actual hosts. One-off preview deployment variables do not configure future Git deployments.
7. Selectively deploy the affected Cloud Functions only AFTER new hosts and sign-in work. The local functions directory contains pre-existing changes; review deployment scope first. Do not use an unreviewed all-functions deployment or accept deletion prompts.
8. Build/sync the mobile apps with new URL variables when ready. Android URL recognition has been extended; verified Android App Links and iOS Universal Links still need the correct signing/domain association setup and physical-device verification. No iOS associated-domain capability or signing change was made here.

No Firebase functions, production SPA or production Next deployment was deployed during this preparation. No Git push was performed. Firebase authorized domains were added as described above, but App Check enforcement/provider settings, auth persistence and account-linking behavior were not changed. No mobile build/sync was run for this migration.

## Activation variables

Frontend Vite build:

```text
VITE_APP_ORIGIN=https://app.shopmythrift.com
VITE_SHARE_ORIGIN=https://shopmythrift.com
```

Next runtime AND build environment:

```text
MYTHRIFT_APP_ORIGIN=https://app.shopmythrift.com
MYTHRIFT_PUBLIC_ORIGIN=https://shopmythrift.com
MYTHRIFT_REDIRECT_PUBLIC_HOME=true
```

Cloud Functions runtime (only after verification):

```text
MYTHRIFT_APP_ORIGIN=https://app.shopmythrift.com
MYTHRIFT_PUBLIC_ORIGIN=https://shopmythrift.com
```

These are public URL settings, not secrets. Do not copy service-account keys or provider credentials into frontend variables or deploy directories.

## Cutover checks

- Apex homepage redirects to app; product/store shares never incorrectly fall back to homepage.
- Known and unknown vendor slugs/products behave correctly; query parameters and payment/auth tokens are preserved.
- Browser GET returns the correct app redirect, while preview crawlers receive title/image/canonical metadata without private vendor fields.
- Direct React routes survive refresh; static assets return correct content types rather than index.html.
- Login, logout, password reset, verification, guest question verification and existing auth intents work.
- Test delivery, pickup, stockpile and Pay-for-me return paths without changing API/payment behavior.
- Existing `.store` and `mx` links remain usable; do not invalidate already-issued emails or payment links.
- Check mobile internal link handling separately from OS-level verified links; passing one does not prove the other.

## User-visible difference and rollback

Browser sign-in and local guest state belong to the origin: users may need to sign in again on `.com`. Server-stored carts, favorites and profile data are not deleted or migrated. Do not promise automatic cross-domain local-storage transfer.

Keep the old deployment as a fallback. Roll back the new-domain deployment/activation settings if verification fails; do not delete old domains, records, functions or data. DNS rollback must use the recorded prior values and preserve mail records.
