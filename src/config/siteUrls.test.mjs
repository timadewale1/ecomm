import test from "node:test";
import assert from "node:assert/strict";
import { createSiteUrls, getAppPath } from "./siteUrls.mjs";

test("new domains are the default; explicit legacy rollback remains supported", () => {
  const urls = createSiteUrls();
  assert.equal(urls.appUrl("/pay/abc"), "https://app.shopmythrift.com/pay/abc");
  assert.equal(urls.productShareUrl("abc"), "https://shopmythrift.com/product/abc?shared=true");
  assert.equal(createSiteUrls({appOrigin:"https://shopmythrift.store"}).appUrl("/pay/abc"), "https://shopmythrift.store/pay/abc");
});

test("new public shares and app actions have separate hosts", () => {
  const urls = createSiteUrls({ appOrigin: "https://app.shopmythrift.com", shareOrigin: "https://shopmythrift.com" });
  assert.equal(urls.appUrl("/pay/token?x=1#payment"), "https://app.shopmythrift.com/pay/token?x=1#payment");
  assert.equal(urls.storeShareUrl({ slug: "my-shop", id: "123" }), "https://shopmythrift.com/my-shop");
  assert.equal(urls.storeShareUrl({ id: "123" }), "https://shopmythrift.com/store/123?shared=true");
  assert.equal(urls.productShareUrl("abc"), "https://shopmythrift.com/product/abc?shared=true");
});

test("configuration cannot send user actions to a different host", () => {
  for (const appOrigin of ["https://evil.test", "https://app.shopmythrift.com/path", "https://user@app.shopmythrift.com", "http://app.shopmythrift.com"]) {
    assert.throws(() => createSiteUrls({ appOrigin }));
  }
  assert.throws(() => createSiteUrls().appUrl("//evil.test"));
  assert.throws(() => createSiteUrls().appUrl("/\\evil.test"));
});

test("old links and new app links preserve full navigation state", () => {
  for (const host of ["shopmythrift.store", "www.shopmythrift.store", "app.shopmythrift.com"]) {
    assert.equal(getAppPath(`https://${host}/pay/test?reference=123#result`), "/pay/test?reference=123#result");
  }
  assert.equal(getAppPath("/offers"), "/offers");
});

test("public product links open internally but marketing and slug links do not", () => {
  for (const host of ["mx.shopmythrift.store", "mx.shopmythrift.com", "shopmythrift.com", "www.shopmythrift.com"]) {
    assert.equal(getAppPath(`https://${host}/product/abc?shared=true`), "/product/abc?shared=true");
    assert.equal(getAppPath(`https://${host}/store/123?shared=true`), "/store/123?shared=true");
    assert.equal(getAppPath(`https://${host}/about`), null);
    assert.equal(getAppPath(`https://${host}/my-shop`), null);
    assert.equal(getAppPath(`https://${host}/`), null);
  }
});

test("lookalike hosts and non-HTTP schemes are not intercepted", () => {
  for (const url of ["https://app.shopmythrift.com.evil.test/product/a", "https://evil.test", "ftp://shopmythrift.store/product/a", "https://user@shopmythrift.store/product/a"]) {
    assert.equal(getAppPath(url), null);
  }
});
