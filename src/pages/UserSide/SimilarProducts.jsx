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
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase.config";
import ProductCard from "../../components/Products/ProductCard";
import LoadProducts from "../../components/Loading/LoadProducts";

const RelatedProducts = ({ product }) => {
  const [ownType, setOwnType] = useState([]); // same vendor & same productType
  const [othersType, setOthersType] = useState([]); // other vendors & same productType
  const [othersCat, setOthersCat] = useState([]); // other vendors & same category
  const [ownCat, setOwnCat] = useState([]); // same vendor & same category (diff type)
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

      // 3) other vendors & same category
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

        // skip those already in type‐based lists
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

      setOwnType(rOwnType);
      setOthersType(rOthersType);
      setOthersCat(rOthersCat);
      setOwnCat(rOwnCat);
      setLoading(false);
    };

    fetchRelated();
  }, [product]);

  if (loading) return <LoadProducts />;

  const allSuggestions = [...ownType, ...othersType, ...othersCat, ...ownCat];

  if (allSuggestions.length === 0) return null;

  return (
    <div className="related-products p-3">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold font-opensans">
          You might also like
        </h2>
        <button
          onClick={() =>
            navigate(`/producttype/${product.productType}`, {
              state: { products: allSuggestions },
            })
          }
          className="text-xs font-normal text-customOrange"
        >
          Show all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ownType.map((p) => (
          <ProductCard key={p.id} product={p} vendorId={p.vendorId} />
        ))}
        {othersType.map((p) => (
          <ProductCard key={p.id} product={p} vendorId={p.vendorId} />
        ))}
        {othersCat.map((p) => (
          <ProductCard key={p.id} product={p} vendorId={p.vendorId} />
        ))}
        {ownCat.map((p) => (
          <ProductCard key={p.id} product={p} vendorId={p.vendorId} />
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
