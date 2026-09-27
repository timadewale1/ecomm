const test = require("node:test");
const assert = require("node:assert/strict");
const { getOrigins, isPreviewCrawler, prepareShareResponse, appDestination, canonicalUrl, previewVendor, previewProduct } = require("./shareRouting.cjs");
const env = { MYTHRIFT_APP_ORIGIN: "https://app.shopmythrift.com", MYTHRIFT_PUBLIC_ORIGIN: "https://shopmythrift.com" };

test("legacy behaviour is retained without activation", () => {
  assert.equal(getOrigins({}).app, "https://shopmythrift.store");
  assert.equal(getOrigins({}).public, "https://mx.shopmythrift.store");
});
test("browser redirect preserves query and sets shared without duplicates", () => {
  assert.equal(appDestination("product", "p1", "/product/p1?tag=a&tag=b&shared=false&offerId=12", env),
    "https://app.shopmythrift.com/product/p1?tag=a&tag=b&shared=true&offerId=12");
  assert.equal(appDestination("store", "v1", "/shop?campaign=abc", env),
    "https://app.shopmythrift.com/store/v1?campaign=abc&shared=true");
});
test("redirect destination never comes from incoming host or return URL", () => {
  assert.ok(appDestination("product", "a/b", "https://evil.test/path?next=https://evil.test", env)
    .startsWith("https://app.shopmythrift.com/product/a%2Fb?"));
  assert.throws(() => getOrigins({ ...env, MYTHRIFT_APP_ORIGIN: "https://evil.test" }));
});
test("canonical URLs use the public host, not app or mx", () => {
  assert.equal(canonicalUrl("store", { id: "v1", slug: "my-shop" }, env), "https://shopmythrift.com/my-shop");
  assert.equal(canonicalUrl("store", { id: "v1" }, env), "https://shopmythrift.com/store/v1");
  assert.equal(canonicalUrl("product", { id: "p1" }, env), "https://shopmythrift.com/product/p1");
});
test("preview crawlers are distinct from real in-app browsers", () => {
  for (const ua of ["Twitterbot/1.0", "facebookexternalhit/1.1", "WhatsApp/2.0", "Slackbot-LinkExpanding", "SnapchatExternalHit", "LinkedInBot", "TelegramBot", "Discordbot", "Googlebot"]) assert.equal(isPreviewCrawler(ua), true, ua);
  for (const ua of ["Mozilla/5.0 Safari/605.1", "Mozilla/5.0 Snapchat/13.0", ""]) assert.equal(isPreviewCrawler(ua), false, ua);
});
test("cache safeguards preserve existing Vary headers", () => {
  const headers = { Vary: "Accept-Encoding" };
  const res = { getHeader: (key) => headers[key], setHeader: (key, value) => { headers[key] = value; } };
  prepareShareResponse(res);
  prepareShareResponse(res);
  assert.equal(headers.Vary, "Accept-Encoding, User-Agent");
  assert.match(headers["Cache-Control"], /no-store/);
});
test("preview data excludes private vendor fields", () => {
  const data = { shopName: "Shop", name: "Product", phoneNumber: "private", bankAccount: "private", idImageUrl: "private" };
  for (const preview of [previewVendor("v", data), previewProduct("p", data)]) {
    assert.equal(preview.phoneNumber, undefined);
    assert.equal(preview.bankAccount, undefined);
    assert.equal(preview.idImageUrl, undefined);
  }
});
