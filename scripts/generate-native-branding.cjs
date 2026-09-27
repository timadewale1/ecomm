/* Native build assets only: never redraw or overwrite the original artwork. */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const ORANGE = "#f9531e"; // Exact background of public/logo.png and splash.png.
const IOS = "ios/App/App/Assets.xcassets";
const ANDROID = "android/app/src/main/res";
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

async function artwork() {
  const logo = await fs.readFile(path.join(ROOT, "public/logo.png"));
  const splash = await fs.readFile(path.join(ROOT, "public/splash.png"));
  const logoInfo = await sharp(logo).metadata();
  const splashInfo = await sharp(splash).metadata();
  assert.equal(logoInfo.width, logoInfo.height, "App icon source must be square");
  assert.ok(splashInfo.height >= splashInfo.width, "Splash source must be portrait");

  // A centred square preserves the original mark and its scale relative to
  // the short screen edge, without stretching the portrait artwork on tablets.
  const splashSquare = await sharp(splash)
    .extract({
      left: 0,
      top: Math.floor((splashInfo.height - splashInfo.width) / 2),
      width: splashInfo.width,
      height: splashInfo.width,
    })
    .removeAlpha()
    .png()
    .toBuffer();

  // Android's system splash uses a 288dp icon container, not a full-screen
  // image. This crop yields an approximately 109dp mark, well inside its
  // 192dp safe circle. Only empty orange margins are cropped.
  const androidSplash = await sharp(splash)
    .extract({ left: 355, top: 2072, width: 2240, height: 2240 })
    .removeAlpha()
    .png()
    .toBuffer();
  return { logo, splashSquare, androidSplash };
}

async function* assets() {
  const { logo, splashSquare, androidSplash } = await artwork();
  const resize = (input, width, height = width) =>
    sharp(input).resize(width, height).flatten({ background: ORANGE }).removeAlpha()
      .png({ compressionLevel: 9 }).toBuffer();
  yield [`${IOS}/AppIcon.appiconset/AppIcon-512@2x.png`, await resize(logo, 1024)];

  // Retain the existing catalogue filenames; 1x/2x/3x now have correct sizes
  // rather than decoding the same oversized 2732px placeholder at every scale.
  for (const [file, scale] of [
    ["splash-2732x2732-2.png", 1],
    ["splash-2732x2732-1.png", 2],
    ["splash-2732x2732.png", 3],
  ]) {
    yield [`${IOS}/Splash.imageset/${file}`, await resize(splashSquare, 390 * scale)];
  }

  for (const [density, scale] of Object.entries(DENSITIES)) {
    for (const name of ["ic_launcher", "ic_launcher_round"]) {
      yield [`${ANDROID}/mipmap-${density}/${name}.png`, await resize(logo, 48 * scale)];
    }
    // The original icon already has ample orange safe margins. Keep the exact
    // artwork; the launcher applies its circle/squircle mask itself.
    yield [`${ANDROID}/mipmap-${density}/ic_launcher_foreground.png`, await resize(logo, 108 * scale)];
    yield [`${ANDROID}/drawable-${density}/splash_icon.png`, await resize(androidSplash, 288 * scale)];
  }

  // Preserve all existing legacy/fallback resource names and dimensions.
  // These are used if the system splash API is unavailable or show() is used.
  const fallback = {
    drawable: [480, 320],
    "drawable-port-mdpi": [320, 480],
    "drawable-port-hdpi": [480, 800],
    "drawable-port-xhdpi": [720, 1280],
    "drawable-port-xxhdpi": [960, 1600],
    "drawable-port-xxxhdpi": [1280, 1920],
    "drawable-land-mdpi": [480, 320],
    "drawable-land-hdpi": [800, 480],
    "drawable-land-xhdpi": [1280, 720],
    "drawable-land-xxhdpi": [1600, 960],
    "drawable-land-xxxhdpi": [1920, 1280],
  };
  for (const [folder, [width, height]] of Object.entries(fallback)) {
    const buffer = await sharp(splashSquare)
      .resize(width, height, { fit: "contain", background: ORANGE })
      .removeAlpha().png({ compressionLevel: 9 }).toBuffer();
    yield [`${ANDROID}/${folder}/splash.png`, buffer];
  }
}

async function main() {
  const check = process.argv.includes("--check");
  let count = 0;
  for await (const [file, buffer] of assets()) {
    const destination = path.join(ROOT, file);
    if (check) {
      assert.ok(buffer.equals(await fs.readFile(destination)), `Stale branding asset: ${file}`);
    } else {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, buffer);
    }
    count++;
  }
  console.log(`${check ? "Verified" : "Generated"} ${count} native branding assets from the original artwork.`);
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { ROOT, ORANGE, IOS, ANDROID, DENSITIES, assets };
