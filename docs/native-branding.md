# Native app icon and splash

The canonical artwork is `public/logo.png` (orange square, white M) and
`public/splash.png` (orange portrait, white M). Originals are not modified.
The background in these files is **#F9531E**, not the inverted white artwork.

Regenerate native sizes after intentionally updating the originals:

```bash
node scripts/generate-native-branding.cjs
node scripts/generate-native-branding.cjs --check
node --test scripts/native-branding.test.cjs
```

- iOS: opaque 1024px AppIcon; correctly scaled 1x/2x/3x Splash image set.
  The launch storyboard aspect-fits the centred artwork over the matching
  orange background, including landscape and iPad. Legacy asset filenames are
  retained, but their dimensions are now 390, 780 and 1170px.
- Android: all five launcher densities, adaptive/round icons, the system
  splash icon inside its safe circle, and portrait/landscape fallback images.
  The launch theme returns to the existing app theme after startup.
- Native launch still belongs to `AppBootstrapGate`: role restoration,
  authentication, deep links, dismissal and the safety timer are unchanged.
- No changes to web/PWA icons, routes, Firebase or in-app logos. No new package
  or artificial launch delay.

Native icons and the OS launch screen need a new native build; a web-only
deployment cannot replace them. Run the updated app from Xcode/Android Studio
without uninstalling it, so account/session data is retained. If an old launch
snapshot is cached, fully quit and relaunch (or restart the device).

Device checks: cold start logged out, remembered buyer/vendor and a deep link;
light/dark OS appearance; Android circular/squircle launchers; compact phone,
tablet and rotation. Hot-resuming an already running app need not show a splash.
