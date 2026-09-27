import React, { useEffect, useMemo, useRef, useState } from "react";
import Compressor from "compressorjs";
import {
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { LuArrowLeft, LuImage, LuStar, LuX } from "react-icons/lu";
import toast from "react-hot-toast";
import { db, storage } from "../../firebase.config";
import { appHaptics } from "../../services/haptics";
import { handleUserActionLimit } from "../../services/userWriteHandler";
import NativeImageInput from "../Inputs/NativeImageInput";
import "./review-composer.css";

const MAX_REVIEW_IMAGES = 2;
const MAX_REVIEW_LENGTH = 200;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const forbiddenWords = [
  "damn",
  "hell",
  "fool",
  "werey",
  "ode",
  "idiot",
  "shit",
  "crap",
  "bastard",
  "bitch",
  "asshole",
  "dick",
  "piss",
  "prick",
  "cunt",
  "fuck",
  "motherfucker",
  "fucker",
  "cock",
  "pussy",
  "twat",
  "whore",
  "slut",
  "nigger",
  "chink",
  "spic",
  "wanker",
  "bollocks",
  "bugger",
  "tosser",
  "shithead",
  "douchebag",
  "jackass",
  "retard",
];

const containsForbiddenWord = (value) => {
  const normalized = String(value || "").toLowerCase();
  return forbiddenWords.some((word) => normalized.includes(word));
};

const safeSegment = (value) =>
  String(value || "unknown")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 180);

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.82,
      maxWidth: 1600,
      maxHeight: 1600,
      convertSize: 750000,
      success: resolve,
      error: reject,
    });
  });

const getVendorImage = (vendor) =>
  vendor?.profileImageUrl || vendor?.photoURL || vendor?.coverImageUrl || "";

const buildProductSnapshots = (items) =>
  (Array.isArray(items) ? items : []).map((item, index) => ({
    key: `${item.productId || "product"}-${item.subProductId || index}-${index}`,
    productId: item.productId || null,
    subProductId: item.subProductId || null,
    productName: item.name || item.productName || "Product",
    productImageUrl: item.imageUrl || item.image || "",
    quantity: Number(item.quantity || 1),
  }));

const ReviewComposer = ({
  vendor,
  order,
  currentUser,
  isProfileComplete,
  initialRating = 0,
  onClose,
  onSuccess,
}) => {
  const inputRef = useRef(null);
  const initialProducts = useMemo(
    () => buildProductSnapshots(order?.cartItems),
    [order]
  );
  const [productSnapshots, setProductSnapshots] = useState(initialProducts);
  const [reviewImages, setReviewImages] = useState([]);
  const reviewImagesRef = useRef([]);
  const [reviewText, setReviewText] = useState("");
  const normalizedInitialRating = Math.min(
    5,
    Math.max(0, Number(initialRating) || 0),
  );
  const [rating, setRating] = useState(normalizedInitialRating);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setProductSnapshots(initialProducts);
    setReviewImages((items) => {
      items.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
    setReviewText("");
    setRating(normalizedInitialRating);
  }, [initialProducts, normalizedInitialRating, order?.reviewTargetKey]);

  useEffect(() => {
    reviewImagesRef.current = reviewImages;
  }, [reviewImages]);

  useEffect(
    () => () => {
      reviewImagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl)
      );
    },
    []
  );

  const removeProductImage = (key) => {
    appHaptics.selection();
    setProductSnapshots((items) =>
      items.map((item) =>
        item.key === key ? { ...item, productImageUrl: "" } : item
      )
    );
  };

  const removeReviewImage = (key) => {
    appHaptics.selection();
    setReviewImages((items) => {
      const removed = items.find((item) => item.key === key);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return items.filter((item) => item.key !== key);
    });
  };

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const remaining = MAX_REVIEW_IMAGES - reviewImages.length;
    if (remaining <= 0) {
      appHaptics.warning();
      toast.error("You can upload up to 2 review images.");
      return;
    }

    const accepted = [];
    for (const file of files.slice(0, remaining)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name} is larger than 8 MB.`);
        continue;
      }
      accepted.push({
        key: `${Date.now()}-${file.name}-${accepted.length}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (files.length > remaining) {
      toast.error("Only 2 review images can be uploaded.");
    }
    if (accepted.length) {
      appHaptics.selection();
      setReviewImages((items) => [...items, ...accepted]);
    }
  };

  const handleRating = (value) => {
    setRating(value);
    appHaptics.selection();
  };

  const uploadReviewImages = async (reviewId) =>
    Promise.all(
      reviewImages.map(async ({ file }, index) => {
        const compressed = await compressImage(file);
        const extension =
          file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
            ? "webp"
            : "jpg";
        const imageRef = ref(
          storage,
          `reviewImages/${safeSegment(vendor.id)}/${safeSegment(
            currentUser.uid
          )}/${safeSegment(reviewId)}/image-${index + 1}.${extension}`
        );
        await uploadBytes(imageRef, compressed, {
          contentType: compressed.type || file.type,
        });
        return getDownloadURL(imageRef);
      })
    );

  const handlePost = async () => {
    if (submitting) return;
    if (!rating) {
      appHaptics.warning();
      toast.error("Choose a star rating first.");
      return;
    }
    if (!currentUser?.uid) {
      toast.error("You must be logged in to submit a review.");
      return;
    }
    if (!isProfileComplete) {
      appHaptics.warning();
      toast.error("Please complete your profile before submitting a review.");
      return;
    }
    if (containsForbiddenWord(reviewText)) {
      appHaptics.warning();
      toast.error("Your review contains inappropriate language.");
      return;
    }
    if (!order?.reviewTargetKey || !vendor?.id) {
      toast.error("This order could not be verified. Please try again.");
      return;
    }

    const reviewId = safeSegment(
      `${currentUser.uid}__${order.reviewTargetKey}`
    );
    const reviewRef = doc(collection(db, "vendors", vendor.id, "reviews"), reviewId);

    try {
      setSubmitting(true);
      const existingReview = await getDoc(reviewRef);
      if (existingReview.exists()) {
        toast("You have already rated this order.");
        onSuccess?.({ id: reviewRef.id, ...existingReview.data() }, order);
        return;
      }

      await handleUserActionLimit(
        currentUser.uid,
        "review",
        {},
        {
          collectionName: "usage_metadata",
          writeLimit: 50,
          minuteLimit: 8,
          hourLimit: 40,
        }
      );

      const reviewImageUrls = await uploadReviewImages(reviewId);
      const orderIds = Array.from(
        new Set((order.orderIds || [order.id]).filter(Boolean))
      );
      const reviewPayload = {
        schemaVersion: 2,
        source: order.isStockpile ? "stockpile_order" : "order",
        reviewTargetKey: order.reviewTargetKey,
        orderId: order.id || orderIds[0] || null,
        orderIds,
        stockpileDocId: order.stockpileDocId || null,
        vendorId: vendor.id,
        userId: currentUser.uid,
        reviewText: reviewText.trim() || null,
        rating,
        userName:
          currentUser.username || currentUser.displayName || "My Thrift shopper",
        userPhotoURL: currentUser.photoURL || null,
        productSnapshots: productSnapshots.map(({ key, ...item }) => item),
        reviewImageUrls,
        createdAt: serverTimestamp(),
      };

      await runTransaction(db, async (transaction) => {
        const duplicate = await transaction.get(reviewRef);
        if (duplicate.exists()) throw new Error("review-already-exists");

        transaction.set(reviewRef, reviewPayload);
        transaction.update(doc(db, "vendors", vendor.id), {
          ratingCount: increment(1),
          rating: increment(rating),
        });
        orderIds.forEach((orderId) => {
          transaction.update(doc(db, "orders", orderId), {
            isReviewed: true,
            reviewId: reviewRef.id,
            reviewRating: rating,
            reviewedAt: serverTimestamp(),
          });
        });
      });

      appHaptics.success();
      toast.success("Review sent successfully");
      onSuccess?.({ id: reviewRef.id, ...reviewPayload }, order);
    } catch (error) {
      console.error("Error submitting order review:", error);
      if (error?.message === "review-already-exists") {
        toast("You have already rated this order.");
      } else {
        appHaptics.error();
        toast.error("Your review could not be posted. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const allAttachments = [
    ...productSnapshots
      .filter((item) => item.productImageUrl)
      .map((item) => ({
        key: `product-${item.key}`,
        sourceKey: item.key,
        url: item.productImageUrl,
        alt: item.productName,
        type: "product",
      })),
    ...reviewImages.map((item, index) => ({
      key: `upload-${item.key}`,
      sourceKey: item.key,
      url: item.previewUrl,
      alt: `Review upload ${index + 1}`,
      type: "upload",
    })),
  ];

  return (
    <section className="review-composer" aria-label="Rate this order">
      <header className="review-composer-header">
        <button type="button" onClick={onClose} aria-label="Back">
          <LuArrowLeft aria-hidden="true" />
        </button>
        <h1>Rate this order</h1>
        <button
          type="button"
          className="review-composer-post"
          onClick={handlePost}
          disabled={submitting}
        >
          {submitting ? "Posting…" : "Post"}
        </button>
      </header>

      <div className="review-composer-vendor">
        {getVendorImage(vendor) ? (
          <img src={getVendorImage(vendor)} alt={vendor.shopName || "Seller"} />
        ) : (
          <span aria-hidden="true">
            {(vendor.shopName || "S").slice(0, 1).toUpperCase()}
          </span>
        )}
        <h2>{vendor.shopName || "Seller"}</h2>
      </div>

      <div className="review-composer-stars" aria-label="Choose a rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleRating(value)}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            aria-pressed={value <= rating}
          >
            <LuStar className={value <= rating ? "is-filled" : ""} />
          </button>
        ))}
      </div>

      <div className="review-composer-field-wrap">
        <div className="review-composer-field">
          <textarea
            value={reviewText}
            onChange={(event) =>
              setReviewText(event.target.value.slice(0, MAX_REVIEW_LENGTH))
            }
            maxLength={MAX_REVIEW_LENGTH}
            placeholder="Write a review (optional)"
          />

          {allAttachments.length > 0 && (
            <div className="review-composer-attachments">
              {allAttachments.map((attachment) => (
                <div className="review-composer-attachment" key={attachment.key}>
                  <img src={attachment.url} alt={attachment.alt} />
                  <button
                    type="button"
                    onClick={() =>
                      attachment.type === "product"
                        ? removeProductImage(attachment.sourceKey)
                        : removeReviewImage(attachment.sourceKey)
                    }
                    aria-label={`Remove ${attachment.alt}`}
                  >
                    <LuX aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="review-composer-image-button"
            onClick={() => inputRef.current?.click()}
            aria-label="Add review images"
          >
            <LuImage aria-hidden="true" />
          </button>
          <NativeImageInput
            ref={inputRef}
            accept="image/*"
            multiple
            nativeMaxFiles={Math.max(
              1,
              MAX_REVIEW_IMAGES - reviewImages.length,
            )}
            hidden
            onChange={handleFiles}
          />
        </div>
        <p>{reviewText.length}/{MAX_REVIEW_LENGTH}</p>
      </div>
    </section>
  );
};

export default ReviewComposer;
