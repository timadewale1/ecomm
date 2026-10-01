import test from "node:test";
import assert from "node:assert/strict";
import {allowsRestrictedVendorFulfilment, mustSignOutRestrictedAccount} from "./accountRestrictionPolicy.mjs";
const restriction = {active: true, scope: "selling", fulfilmentOnly: true};
test("only explicit vendor fulfilment restrictions preserve a restricted session", () => {
  assert.equal(mustSignOutRestrictedAccount({role: "vendor", isDeactivated: true, accountRestriction: restriction}), false);
  for (const profile of [
    {role: "vendor", isDeactivated: true},
    {role: "user", isDeactivated: true, accountRestriction: restriction},
    {role: "vendor", isDeactivated: true, accountRestriction: {...restriction, active: false}},
    {role: "vendor", isDeactivated: true, accountRestriction: {...restriction, scope: "account"}},
  ]) {
    assert.equal(allowsRestrictedVendorFulfilment(profile), false);
    assert.equal(mustSignOutRestrictedAccount(profile), true);
  }
  assert.equal(mustSignOutRestrictedAccount(null), false);
  assert.equal(mustSignOutRestrictedAccount({role: "vendor", isDeactivated: false}), false);
});
