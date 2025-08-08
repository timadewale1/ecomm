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
  orderBy,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { db } from "../../firebase.config";
import ProductCard from "../../components/Products/ProductCard";
import LoadProducts from "../../components/Loading/LoadProducts";

const TARGET_COUNT = 24; // aim for 10–12 items
const SIMILAR_CAP = 6; // take up to 6 “closest” before random fill
const POOL_LIMIT = 50; // size of the fetch pool to shuffle from

const RelatedProducts = ({ product }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Quick mode state
  const { isActive: quickActive = false, vendorId: quickVendorId = null } =
    useSelector((s) => s.quickMode ?? {});
  const quickForThisVendor =
    quickActive && quickVendorId && product?.vendorId === quickVendorId;

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

      // QUICK MODE: only this vendor
      if (quickForThisVendor) {
        const out = [];

        // 1) similar = same vendor + same productType
        const qSimilar = query(
          productsRef,
          where("vendorId", "==", product.vendorId),
          where("productType", "==", product.productType),
          where("published", "==", true),
          where("isDeleted", "==", false),
          limit(POOL_LIMIT)
        );
        const snapSimilar = await getDocs(qSimilar);
        for (const d of snapSimilar.docs) {
          if (d.id === product.id) continue;
          out.push({ id: d.id, ...d.data() });
          if (out.length >= SIMILAR_CAP) break;
        }

        // 2) fill = same vendor (any type), random
        //    fetch a larger pool, then shuffle and take the remaining slots
        const qPool = query(
          productsRef,
          where("vendorId", "==", product.vendorId),
          where("published", "==", true),
          where("isDeleted", "==", false),
          orderBy("createdAt", "desc"),
          limit(POOL_LIMIT)
        );
        const snapPool = await getDocs(qPool);

        const already = new Set([product.id, ...out.map((p) => p.id)]);
        const pool = [];
        for (const d of snapPool.docs) {
          if (already.has(d.id)) continue;
          pool.push({ id: d.id, ...d.data() });
        }

        // Shuffle client-side
        pool.sort(() => 0.5 - Math.random());

        // Fill up to TARGET_COUNT
        const needed = Math.max(0, TARGET_COUNT - out.length);
        out.push(...pool.slice(0, needed));

        setSuggestions(out);
        setLoading(false);
        return;
      }

      // NORMAL MODE (your existing 4-bucket approach)
      const rOwnType = [];
      const rOthersType = [];
      const rOthersCat = [];
      const rOwnCat = [];

      // 1) same vendor & same productType
      const q1 = query(
        productsRef,
        where("vendorId", "==", product.vendorId),
        where("productType", "==", product.productType),
        where("published", "==", true),
        where("isDeleted", "==", false),
        limit(5)
      );
      const snap1 = await getDocs(q1);
      for (const d of snap1.docs) {
        if (d.id === product.id) continue;
        if (await isVendorActive(d.data().vendorId)) {
          rOwnType.push({ id: d.id, ...d.data() });
          if (rOwnType.length >= 4) break;
        }
      }

      // 2) other vendors & same productType
      const q2 = query(
        productsRef,
        where("vendorId", "!=", product.vendorId),
        where("productType", "==", product.productType),
        where("published", "==", true),
        where("isDeleted", "==", false),
        limit(15)
      );
      const snap2 = await getDocs(q2);
      for (const d of snap2.docs) {
        if (await isVendorActive(d.data().vendorId)) {
          rOthersType.push({ id: d.id, ...d.data() });
          if (rOthersType.length >= 10) break;
        }
      }

      // 3) other vendors & same category (and same vendor diff type)
      const q3 = query(
        productsRef,
        where("category", "==", product.category),
        where("published", "==", true),
        where("isDeleted", "==", false),
        limit(15)
      );
      const snap3 = await getDocs(q3);
      for (const d of snap3.docs) {
        if (d.id === product.id) continue;
        const vId = d.data().vendorId;
        const isOwn = vId === product.vendorId;
        if (!(await isVendorActive(vId))) continue;

        // skip those already in type-based lists
        if (
          rOwnType.some((p) => p.id === d.id) ||
          rOthersType.some((p) => p.id === d.id)
        ) {
          continue;
        }

        if (!isOwn) {
          rOthersCat.push({ id: d.id, ...d.data() });
          if (rOthersCat.length >= 10) continue;
        } else {
          // same vendor but different type
          rOwnCat.push({ id: d.id, ...d.data() });
          if (rOwnCat.length >= 4) continue;
        }
      }

      setSuggestions([...rOwnType, ...rOthersType, ...rOthersCat, ...rOwnCat]);
      setLoading(false);
    };

    fetchRelated();
  }, [product, quickForThisVendor]);

  if (loading) return <LoadProducts />;

  if (!suggestions.length) return null;

  return (
    <div className="related-products p-3">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold font-opensans">
          You might also like
        </h2>

        {/* In quick mode we keep users within the store, so hide "Show all".
            Otherwise keep your existing navigation by productType. */}
        {!quickForThisVendor && (
          <button
            onClick={() =>
              navigate(`/producttype/${product.productType}`, {
                state: { products: suggestions },
              })
            }
            className="text-xs font-normal text-customOrange"
          >
            Show all
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {suggestions.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            vendorId={p.vendorId}
            quickForThisVendor={quickForThisVendor}
          />
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
