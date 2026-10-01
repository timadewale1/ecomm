# My Thrift .com migration

Updated 1 October 2026. Publishing was resumed with the owner's approval. This supersedes the September publishing hold and temporary homepage-redirect plan.

## Live routing

| Address | Behaviour |
| --- | --- |
| `shopmythrift.com/` | Marketing/landing website |
| `www.shopmythrift.com/…` | Temporary 307 redirect to the matching apex URL |
| `app.shopmythrift.com/…` | React marketplace, including direct auth, payment, order and chat routes |
| `shopmythrift.com/product/:id` | Rich product preview for crawlers; browser redirects to the matching app product |
| `shopmythrift.com/store/:id` | Rich vendor preview; browser redirects to the matching app store |
| `shopmythrift.com/:vendorSlug` | Resolves the public vendor slug, renders rich metadata or redirects to app `/store/:id` |

Existing `.store`, `www.shopmythrift.store` and `mx.shopmythrift.store` remain attached and usable. Old rich links now direct browsers to the new app origin. Already-issued URLs have not been deleted.

## Hosting and DNS

Vercel team: `my-thrift`. Marketplace project `mythrift` and legacy rich-link project `mythriftnextjs` remain connected to `timadewale1/ecomm`, branch `main`. The app release merged through PR #492, commit `4186c2951fa2fda8246a086d76ad1ce3b4551dcd`.

The landing site was deployed directly to existing project `mythrift-landing` with explicit owner approval because the signed-in GitHub account cannot access `mythrift/mythrift-landing`. Source is committed locally: `ed0916d`; verification/ignore follow-up `097c779`. Reconnecting Git publication still requires repository access.

Cloudflare `.com` records are DNS-only:

| Record | Target |
| --- | --- |
| Apex CNAME | `435cddb435dc760a.vercel-dns-016.com` |
| `www` CNAME | `435cddb435dc760a.vercel-dns-016.com` |
| `app` CNAME | `047261564b92c1d8.vercel-dns-017.com` |

Previous apex: A `162.255.119.155`. Previous www: CNAME `parkingpage.namecheap.com`. App was added during cutover. Mail MX/TXT records and the old domain's DNS were not modified. TLS and the www redirect were verified.

## Security and compatibility

- Firebase Auth already authorizes apex, www and app `.com`. The existing Firebase authDomain and sign-in logic remain unchanged.
- Added the three exact hosts to existing reCAPTCHA and browser Maps referrer allowlists; retained all legacy entries and API restrictions.
- Landing previews read only publicProducts/publicVendors anonymously through existing Firestore rules, with field masks and bounded slug queries. No service-account credential or private vendor-document access was added.
- Share redirects retain query parameters. Crawler responses use no-store/User-Agent variance; missing public products/slugs return 404.
- Frontend, legacy Next and backend URL helpers now default to `.com`; incoming old-host recognition remains.
- Sitemap generation uses eligible public vendors, not all private vendor records.
- Email addresses such as `hello@shopmythrift.store`, the blog host, provider API domains, database rules and schema are intentionally unchanged.

## Backend rollout

Only outbound-link consumers are included, not an all-functions deployment. Each release uses that function's exact downloaded deployed source. Existing helpers receive the new default destinations; older source receives mechanical URL-string-only changes. CORS allowlists retain legacy origins. All other files/packages/business logic are byte-identical to the prior source.

Function environment variables, runtime, IAM, triggers, schedules, payment amounts and order state transitions are unchanged. `processProductFollowerFanoutJobs` was not previously deployed and was deliberately not introduced.

See sibling `verification/rollouts/2026-10-01-com-domain-cutover.json` for final function verification and deployment evidence. Do not deploy the entire unrelated dirty backend working tree to repeat this migration.

## Verification

- 21 landing unit tests, typecheck and production build passed.
- 13 live .com HTTP checks passed: landing, route forwarding, query preservation, missing records, robots and sitemap.
- Real product/store/slug previews and browser redirects passed.
- 14 frontend/legacy-Next routing tests passed.
- 30 backend URL/email/signup/delivery-checkout regression tests passed.
- The new app product page rendered at mobile size, including seller products and actions, with no captured runtime errors. Login entry rendered correctly.
- React production build, Capacitor iOS/Android sync, Android debug/unit-test tasks and unsigned iOS device build passed.

## Acceptance limits

Actual account sign-in/OAuth, verification/reset emails and a paid end-to-end checkout still need owner testing on the new origin and installed mobile builds. No test purchase or wallet charge was made.

OS-level Android verified App Links and iOS Universal Links still require correct release signing/domain associations and physical-device validation. Internal URL handling and successful builds do not prove OS-level association. No signing capability or certificate was invented or changed.

Browser sessions/guest local storage belong to their origin, so users may need to sign in on the new app domain. Server-stored carts, favourites and profiles were not deleted or migrated. Old web remains available; automatic cross-domain guest local-storage transfer is not promised. Native apps retain their existing local origin.

## Recovery

Retain old domains and deployments. Roll back the relevant Vercel deployment or function's recorded previous source if needed; do not delete accounts, records, functions or mail DNS. Prior source archives and release receipts were retained locally. Restoring parking DNS is not a substitute for an app rollback.
