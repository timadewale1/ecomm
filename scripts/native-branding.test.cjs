const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const { ROOT, IOS, ANDROID, DENSITIES } = require("./generate-native-branding.cjs");
const read = (name) => fs.readFile(path.join(ROOT, name), "utf8");

async function inspect(file, width, height = width, safeRadius) {
  const image = sharp(path.join(ROOT, file));
  const metadata = await image.metadata();
  assert.equal(metadata.width, width, file);
  assert.equal(metadata.height, height, file);
  assert.equal(metadata.hasAlpha, false, `Native artwork must be opaque: ${file}`);
  const { data } = await image.raw().toBuffer({ resolveWithObject: true });
  for (const pixel of [0, width - 1, width * (height - 1), width * height - 1]) {
    assert.deepEqual(Array.from(data.subarray(pixel * 3, pixel * 3 + 3)), [249, 83, 30], file);
  }
  let whitePixels = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 3;
    if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
      whitePixels++;
      if (safeRadius) assert.ok(
        Math.hypot(x - width / 2, y - height / 2) <= safeRadius,
        `Logo clipped by Android's circular safe area: ${file}`,
      );
    }
  }
  assert.ok(whitePixels > width * height * 0.01, `Missing white M: ${file}`);
}

test("iOS opaque AppIcon and scale-correct splash catalogue", async () => {
  await inspect(`${IOS}/AppIcon.appiconset/AppIcon-512@2x.png`, 1024);
  const catalogue = JSON.parse(await read(`${IOS}/Splash.imageset/Contents.json`));
  for (const item of catalogue.images) {
    await inspect(`${IOS}/Splash.imageset/${item.filename}`, 390 * Number(item.scale[0]));
  }
});

test("Android icons fit launcher and system-splash safe circles at every density", async () => {
  for (const [density, scale] of Object.entries(DENSITIES)) {
    await inspect(`${ANDROID}/mipmap-${density}/ic_launcher.png`, 48 * scale);
    await inspect(`${ANDROID}/mipmap-${density}/ic_launcher_round.png`, 48 * scale);
    await inspect(`${ANDROID}/mipmap-${density}/ic_launcher_foreground.png`, 108 * scale, 108 * scale, 33 * scale);
    await inspect(`${ANDROID}/drawable-${density}/splash_icon.png`, 288 * scale, 288 * scale, 96 * scale);
  }
});

test("native launch uses matching orange and preserves bootstrap-owned dismissal", async () => {
  const config = await read("capacitor.config.ts");
  assert.match(config, /launchAutoHide:\s*false/);
  assert.match(config, /backgroundColor:\s*'#f9531e'/);
  const storyboard = await read("ios/App/App/Base.lproj/LaunchScreen.storyboard");
  assert.match(storyboard, /contentMode="scaleAspectFit"/);
  assert.doesNotMatch(storyboard, /systemBackgroundColor/);
  const theme = await read(`${ANDROID}/values/styles.xml`);
  assert.match(theme, /name="windowSplashScreenAnimatedIcon">@drawable\/splash_icon/);
  assert.match(theme, /name="windowSplashScreenBackground">@color\/ic_launcher_background/);
  assert.match(theme, /name="postSplashScreenTheme">@style\/AppTheme.NoActionBar/);
  assert.match(await read(`${ANDROID}/values/ic_launcher_background.xml`), /#F9531E/);
});
