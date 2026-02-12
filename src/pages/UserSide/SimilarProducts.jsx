// src/components/RelatedProducts.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { useSelector } from "react-redux";
import { db } from "../../firebase.config";
import ProductCard from "../../components/Products/ProductCard";
import LoadProducts from "../../components/Loading/LoadProducts";

const TARGET_COUNT = 30; // ✅ show up to 30
const POOL_LIMIT = 80; // fetch pool size (client filters + dedupe)

const RelatedProducts = ({ product }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick mode state
  const { isActive: quickActive = false, vendorId: quickVendorId = null } =
    useSelector((s) => s.quickMode ?? {});

  const quickForThisVendor =
    quickActive && quickVendorId && product?.vendorId === quickVendorId;

  // ✅ In quickmode: don't show this section at all
  if (quickForThisVendor) return null;

  // only show products whose vendor is approved & active
  const isVendorActive = async (vendorId) => {
    const snap = await getDoc(doc(db, "vendors", vendorId));
    if (!snap.exists()) return false;
    const { isApproved, isDeactivated } = snap.data();
    return isApproved && !isDeactivated;
  };

  useEffect(() => {
    const fetchRelated = async () => {
      if (!product) return;

      setLoading(true);

      const productsRef = collection(db, "products");

      // Cache vendor checks to avoid re-reading vendor docs repeatedly
      const vendorOkCache = new Map();
      const vendorOk = async (vendorId) => {
        if (vendorOkCache.has(vendorId)) return vendorOkCache.get(vendorId);
        const ok = await isVendorActive(vendorId);
        vendorOkCache.set(vendorId, ok);
        return ok;
      };

      const out = [];
      const seen = new Set([product.id]);

      // helper: push item if valid + unique + other vendor
      const tryPush = async (d) => {
        if (!d) return false;

        const data = d.data();
        const vId = data.vendorId;
const qty = Number(data?.stockQuantity ?? 0);
if (qty <= 0) return false;

        // ✅ exclude current vendor + current product + dupes
        if (!vId || vId === product.vendorId) return false;
        if (d.id === product.id) return false;
        if (seen.has(d.id)) return false;

        // ✅ vendor must be active
        if (!(await vendorOk(vId))) return false;

        seen.add(d.id);
        out.push({ id: d.id, ...data });
        return true;
      };

      try {
        /**
         * 1) OTHER VENDORS + SAME productType (highest relevance)
         */
        if (product.productType) {
          const qType = query(
            productsRef,
            where("productType", "==", product.productType),
            where("published", "==", true),
            where("isDeleted", "==", false),
            limit(POOL_LIMIT),
          );

          const snapType = await getDocs(qType);
          for (const d of snapType.docs) {
            await tryPush(d);
            if (out.length >= TARGET_COUNT) break;
          }
        }

        /**
         * 2) OTHER VENDORS + SAME category (fill remaining)
         */
        if (out.length < TARGET_COUNT && product.category) {
          const qCat = query(
            productsRef,
            where("category", "==", product.category),
            where("published", "==", true),
            where("isDeleted", "==", false),
            limit(POOL_LIMIT),
          );

          const snapCat = await getDocs(qCat);
          for (const d of snapCat.docs) {
            await tryPush(d);
            if (out.length >= TARGET_COUNT) break;
          }
        }

        setSuggestions(out.slice(0, TARGET_COUNT));
      } catch (e) {
        console.error("[RelatedProducts] fetch failed:", e);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
  }, [product]);

  if (!product) return null;
  if (loading) return <LoadProducts />;
  if (!suggestions.length) return null;

  return (
    <div className="related-products pb-8  px-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold font-opensans">Similar Items</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {suggestions.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            vendorId={p.vendorId}
            quickForThisVendor={false}
          />
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
