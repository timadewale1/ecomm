const fs = require("node:fs");
const path = require("node:path");

// Keep this patch small and version-checked: npm install and cap copy/sync must
// not silently restore the upstream animation-duration + 200ms resize delay.
const SUPPORTED_VERSION = "8.0.5";
const replacements = [
  [
    "#pragma mark Keyboard events\n",
    `#pragma mark Keyboard events

// My Thrift: resize with the system keyboard, not after its animation.
- (void)mythriftAnimateKeyboardHeight:(int)height notification:(NSNotification *)notification
{
  [NSObject cancelPreviousPerformRequestsWithTarget:self selector:@selector(_updateFrame) object:nil];
  NSTimeInterval duration = [notification.userInfo[UIKeyboardAnimationDurationUserInfoKey] doubleValue];
  NSUInteger curve = [notification.userInfo[UIKeyboardAnimationCurveUserInfoKey] unsignedIntegerValue];
  UIViewAnimationOptions options = (UIViewAnimationOptions)(curve << 16)
    | UIViewAnimationOptionBeginFromCurrentState | UIViewAnimationOptionAllowUserInteraction;

  [UIView animateWithDuration:duration delay:0 options:options animations:^{
    self.paddingBottom = height;
    // Also update for a same-height notification (e.g. a changed window width).
    [self _updateFrame];
  } completion:nil];
}
`,
  ],
  [
    "  [self setKeyboardHeight:0 delay:0.01];",
    `  if (self.keyboardResizes == ResizeNative) {
    [self mythriftAnimateKeyboardHeight:0 notification:notification];
  } else {
    [self setKeyboardHeight:0 delay:0.01];
  }`,
  ],
  [
    `  double duration = [[notification.userInfo valueForKey:UIKeyboardAnimationDurationUserInfoKey] doubleValue]+0.2;
  [self setKeyboardHeight:(int)height delay:duration];`,
    `  if (self.keyboardResizes == ResizeNative) {
    [self mythriftAnimateKeyboardHeight:(int)height notification:notification];
  } else {
    double duration = [[notification.userInfo valueForKey:UIKeyboardAnimationDurationUserInfoKey] doubleValue]+0.2;
    [self setKeyboardHeight:(int)height delay:duration];
  }`,
  ],
];

function patchKeyboardSource(source, version) {
  if (version !== SUPPORTED_VERSION) {
    throw new Error(`Review the iOS keyboard patch before upgrading @capacitor/keyboard: expected ${SUPPORTED_VERSION}, found ${version}.`);
  }
  const normalized = source.replace(/\r\n/g, "\n");
  if (replacements.every(([, after]) => normalized.includes(after))) return source;
  if (normalized.includes("mythriftAnimateKeyboardHeight")) {
    throw new Error("The iOS keyboard patch is incomplete; review Keyboard.m before building.");
  }
  // Validate every anchor before changing anything. Leave unrelated upstream
  // geometry, iPad handling, events and non-native resize modes untouched.
  for (const [before] of replacements) {
    if (normalized.split(before).length !== 2) {
      throw new Error("The iOS keyboard source changed; review the patch before building.");
    }
  }
  let patched = normalized;
  for (const [before, after] of replacements) patched = patched.replace(before, after);
  return source.includes("\r\n") ? patched.replace(/\n/g, "\r\n") : patched;
}

if (require.main === module) {
  try {
    if (!process.env.CAPACITOR_PLATFORM_NAME || process.env.CAPACITOR_PLATFORM_NAME === "ios") {
      const root = path.resolve(__dirname, "../node_modules/@capacitor/keyboard");
      const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
      const file = path.join(root, "ios/Sources/KeyboardPlugin/Keyboard.m");
      const source = fs.readFileSync(file, "utf8");
      const patched = patchKeyboardSource(source, version);
      if (patched !== source) fs.writeFileSync(file, patched);
      console.log(`[ios-keyboard] ${patched === source ? "Verified" : "Applied"} synchronized native resize patch.`);
    }
  } catch (error) {
    console.error(`[ios-keyboard] ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { patchKeyboardSource, replacements, SUPPORTED_VERSION };
