# Google web redirect and sign-in transition

## Scope

- Production marketplace hosts use same-tab Google sign-in: `app.shopmythrift.com`, `shopmythrift.store`, `www.shopmythrift.store`.
- Localhost and unregistered preview hosts retain the existing Google popup. Native Google, X/Apple configuration, email credentials, payment logic and security rules are unchanged.
- `/auth/google` alone uses a same-origin Firebase `authDomain`. Its `/__/auth/*` helper requests are transparently proxied to Firebase by Vercel (not an HTTP redirect). After completing the Firebase session, it returns to the originating page and reinitializes the ordinary app with its existing auth domain.
- The new Google OAuth client callback URLs were added without deleting the existing Firebase and `.store` callbacks. No new scopes or client secrets are required.

## Safety and continuation

- Per-tab, expiring attempt state contains route/context/UID, never provider tokens or credentials. Return URLs are restricted to local paths. Firebase still owns OAuth state and authentication validation.
- The return coordinator is single-flight under React StrictMode; profile eligibility/provisioning precedes cart import and route guards. Retries after a consumed redirect result require the same authenticated UID.
- Existing guest/anonymous cart import remains idempotent. Browser Back/cancellation never resumes an action using a previously signed-in account.
- Existing auth intents resume follow, offers, profile/wallet, cart checkout and Buy Now. Incomplete checkout retains the details sheet; ordinary sign-in does not demand profile completion. Quick basket restores its existing name/delivery steps. No payment is automatically submitted.
- A full-screen translucent black layer, white spinner, screen-reader status, background interaction lock and reduced-motion treatment cover sign-in completion and lazy-route loading. An immediate HTML shell covers OAuth boot before the JS bundle loads. Slow requests offer a reload action rather than an endless unescapable spinner.

## Verification

Run `node --test src/services/webAuthRedirect.test.mjs src/services/accountLookupClient.test.mjs src/services/accountRestrictionPolicy.test.mjs src/config/siteUrls.test.mjs`, `node scripts/verify-cart-persistence.mjs`, `node scripts/verify-cart-auth-boundary.mjs`, and `npm run build`.

Production verification must check `/__/auth/handler`, `/__/auth/iframe`, and `/auth/google` on the configured hosts. The helper must return Firebase HTML (not the SPA/offline HTML); normal app routes and assets must continue to load. Complete a real Google sign-in on Safari and Chrome, including a modal-originated login and checkout, before claiming end-to-end account validation.

Native web assets can be updated with `npx cap copy ios` and `npx cap copy android`; this change does not require new native plugins or CocoaPods dependencies.
