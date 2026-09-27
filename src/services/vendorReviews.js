import {
  deleteField,
  doc,
  runTransaction,
} from "firebase/firestore";
import {
  deleteObject,
  listAll,
  ref,
} from "firebase/storage";
import { db, storage } from "../firebase.config";

const uniqueStrings = (values) =>
  Array.from(new Set((values || []).filter((value) => typeof value === "string" && value)));

const removeUploadedReviewImages = async ({ vendorId, userId, reviewId }) => {
  try {
    const folder = ref(storage, `reviewImages/${vendorId}/${userId}/${reviewId}`);
    const contents = await listAll(folder);
    await Promise.all(contents.items.map((item) => deleteObject(item)));
  } catch (error) {
    // Storage cleanup is secondary to the database transaction. Keep the
    // review deleted even if an old upload cannot be found or removed.
    console.warn("[reviews] Uploaded image cleanup did not complete:", {
      vendorId,
      reviewId,
      code: error?.code,
    });
  }
};

export const deleteOwnedVendorReview = async ({ vendorId, reviewId, userId }) => {
  if (!vendorId || !reviewId || !userId) {
    throw new Error("review-delete-missing-context");
  }

  const vendorRef = doc(db, "vendors", vendorId);
  const reviewRef = doc(db, "vendors", vendorId, "reviews", reviewId);

  const result = await runTransaction(db, async (transaction) => {
    const reviewSnapshot = await transaction.get(reviewRef);
    if (!reviewSnapshot.exists()) {
      return { alreadyDeleted: true, rating: null, ratingCount: null };
    }

    const review = reviewSnapshot.data();
    if ((review.userId || review.uid) !== userId) {
      throw new Error("review-delete-not-owner");
    }

    const vendorSnapshot = await transaction.get(vendorRef);
    const orderIds = uniqueStrings([
      ...(Array.isArray(review.orderIds) ? review.orderIds : []),
      review.orderId,
    ]);
    const orderRefs = orderIds.map((orderId) => doc(db, "orders", orderId));
    const orderSnapshots = await Promise.all(
      orderRefs.map((orderRef) => transaction.get(orderRef)),
    );

    const currentRatingCount = Number(vendorSnapshot.data()?.ratingCount || 0);
    const currentRatingTotal = Number(vendorSnapshot.data()?.rating || 0);
    const removedRating = Number(review.rating || 0);
    const nextRatingCount = Math.max(0, currentRatingCount - 1);
    const nextRatingTotal = nextRatingCount
      ? Math.max(0, currentRatingTotal - removedRating)
      : 0;

    transaction.delete(reviewRef);
    if (vendorSnapshot.exists()) {
      transaction.update(vendorRef, {
        ratingCount: nextRatingCount,
        rating: nextRatingTotal,
      });
    }

    orderSnapshots.forEach((orderSnapshot, index) => {
      if (!orderSnapshot.exists()) return;
      transaction.update(orderRefs[index], {
        isReviewed: false,
        reviewId: deleteField(),
        reviewRating: deleteField(),
        reviewedAt: deleteField(),
      });
    });

    return {
      alreadyDeleted: false,
      rating: nextRatingTotal,
      ratingCount: nextRatingCount,
    };
  });

  if (!result.alreadyDeleted) {
    await removeUploadedReviewImages({ vendorId, userId, reviewId });
  }

  return result;
};
