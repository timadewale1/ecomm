import React from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../../firebase.config";
import DiscountModal from "./DiscountModal";

/**
 * Persists a discount for an existing product while reusing the same discount
 * composer shown by Add Product. Keeping persistence here preserves the
 * catalogue's existing Firestore schema and activity feed behavior.
 */
const SingleDiscountModal = ({ isOpen, onRequestClose, product }) => {
  const saveDiscount = async (discountDetails) => {
    if (!product?.id || !product?.vendorId) {
      toast.error(
        "This product could not be updated. Please reopen it and try again.",
      );
      throw new Error("Product identity is missing");
    }

    try {
      const productRef = doc(db, "products", product.id);
      const vendorRef = doc(db, "vendors", product.vendorId);
      const discountRef = doc(collection(db, "discounts"));
      const isFreebie = discountDetails.discountType === "personal-freebies";

      const discountData = {
        vendorId: product.vendorId,
        type: discountDetails.discountType.startsWith("inApp")
          ? "inApp"
          : "personal",
        isActive: true,
        createdAt: serverTimestamp(),
        ...(discountDetails.discountType.startsWith("personal")
          ? {
              discountSubType:
                discountDetails.discountType === "personal-monetary"
                  ? "monetary"
                  : "freebies",
            }
          : {}),
        ...(!isFreebie && discountDetails.initialPrice
          ? {
              initialPrice: discountDetails.initialPrice,
              discountPrice: discountDetails.discountPrice,
              percentageCut: discountDetails.percentageCut,
              subtractiveValue: discountDetails.subtractiveValue,
            }
          : {}),
        ...(isFreebie ? { freebieText: discountDetails.freebieText } : {}),
        ...(discountDetails.selectedDiscount
          ? {
              selectedDiscountId: discountDetails.selectedDiscount.id,
              selectedDiscountName: discountDetails.selectedDiscount.name,
            }
          : {}),
      };

      await setDoc(discountRef, discountData);
      await updateDoc(vendorRef, {
        discountIds: arrayUnion(discountRef.id),
      });
      await updateDoc(productRef, {
        discount: discountDetails,
        discountId: discountRef.id,
        ...(!isFreebie && discountDetails.discountPrice
          ? { price: discountDetails.discountPrice }
          : {}),
      });

      try {
        await addDoc(
          collection(db, "vendors", product.vendorId, "activityNotes"),
          {
            title: "Running a Discount 🏷",
            type: "Discount Update",
            timestamp: new Date(),
            note: `You've applied a ${
              discountDetails.discountType.startsWith("inApp")
                ? "store-wide"
                : "personal"
            } discount on ${product.name}. Check your store for more details!`,
          },
        );
      } catch (activityError) {
        // The discount is already safely applied; activity logging is not
        // allowed to turn a successful catalogue update into a false failure.
        console.warn("Discount activity could not be recorded:", activityError);
      }

      toast.success("Discount saved and applied successfully!");
    } catch (error) {
      console.error("Error saving discount:", error);
      toast.error("We couldn't save this discount. Please try again.");
      throw error;
    }
  };

  return (
    <DiscountModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      handleSaveDiscount={saveDiscount}
      initialPriceValue={product?.price}
      initialPriceLocked
    />
  );
};

export default SingleDiscountModal;
