# iOS keyboard timing

The app uses Capacitor's `native` resize mode. Keyboard 8.0.5 postpones the
WebView resize by the keyboard animation duration **plus 200ms**. The previous
app-level `keyboardDidShow` smooth scroll and sheet-level 180ms smooth scroll
made the adjustment feel even later.

`scripts/patch-ios-keyboard.cjs` replaces only the native-mode show/hide resize
with a UIKit animation using the system's duration and curve. Existing frame
calculations, iPad/QuickType handling and keyboard events stay intact. It runs
after dependency installation and before Capacitor copy/sync. It is idempotent
and stops with an error if the dependency version or patch anchors change.
Review/remove the patch when upgrading the keyboard dependency; do not bypass
the version guard. No dependency upgrade or new native plugin is required.

`iosKeyboardViewport.mjs` handles iOS focus visibility once, using actual viewport
changes and animation frames. It scrolls only as far as needed, keeps scrolling
inside a sheet, and cancels work when the keyboard hides or the app unmounts.
It does not react to manual scrolling or apply an extra keyboard-height inset.
Android/web retain their existing keyboard handling.

Run `npm run test:ios-keyboard`, rebuild the web app, then `npx cap copy ios` and
build in Xcode. A live web refresh alone cannot update the native plugin.

On a physical iPhone, check low checkout/profile fields, login/question sheets,
chat input, switching between inputs while the keyboard is open, dismissing a
sheet mid-animation, keyboard hide/show and landscape rotation. Check iPad with
a hardware keyboard/QuickType when available. The page should move with the
keyboard without a second smooth jump, and normal scrolling must remain free.
