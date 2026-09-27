import React, { useEffect, useMemo } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useDispatch, useSelector } from "react-redux";
import ProductCard from "../../components/Products/ProductCard";
import { useAuth } from "../../custom-hooks/useAuth";
import { getAnonymousIdV2 } from "../../services/signals";
import {
  fetchSimilarItems,
  selectSimilarItemsEntry,
  similarItemsEntryAccessed,
} from "../../redux/reducers/similarItemsSlice";

const SimilarItemsSkeleton = () => (
  <div className="related-products px-2 pb-8 pt-4">
    <Skeleton width={120} height={22} />
    <div className="mt-4 grid grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index}>
          <Skeleton height={176} borderRadius={12} />
          <Skeleton width="80%" height={15} className="mt-2" />
          <Skeleton width="45%" height={15} />
        </div>
      ))}
    </div>
  </div>
);

const RelatedProducts = ({ product }) => {
  const dispatch = useDispatch();
  const productId = product?.id || product?.productId;
  const { currentUser } = useAuth();
  const anonymousId = useMemo(() => getAnonymousIdV2(), []);
  const viewerKey = currentUser?.uid
    ? `user:${currentUser.uid}`
    : `guest:${anonymousId}`;
  const entry = useSelector((state) =>
    selectSimilarItemsEntry(state, productId, viewerKey),
  );

  const { isActive: quickActive = false, vendorId: quickVendorId = null } =
    useSelector((state) => state.quickMode ?? {});
  const quickForThisVendor =
    quickActive && quickVendorId && product?.vendorId === quickVendorId;

  useEffect(() => {
    if (!productId || quickForThisVendor) return;
    dispatch(similarItemsEntryAccessed({ productId, viewerKey }));
    dispatch(fetchSimilarItems({ productId, viewerKey }));
  }, [dispatch, productId, quickForThisVendor, viewerKey]);

  if (!productId || quickForThisVendor) return null;
  if (!entry.items.length && entry.status === "loading") {
    return <SimilarItemsSkeleton />;
  }
  if (!entry.items.length) return null;

  return (
    <div className="related-products px-2 pb-8 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold font-opensans">Similar Items</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {entry.items.map((candidate, index) => (
          <ProductCard
            key={candidate.id}
            product={candidate}
            vendorId={candidate.vendorId}
            quickForThisVendor={false}
            surface="similar_items"
            position={
              Number.isFinite(Number(candidate.position))
                ? Number(candidate.position)
                : index
            }
            requestId={entry.responseRequestId}
            algorithmVersion={entry.algorithmVersion}
            candidateSource={candidate.candidateSource || "semantic_match"}
          />
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
