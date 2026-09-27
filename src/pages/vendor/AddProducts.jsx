import React, { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  collection,
  addDoc,
  serverTimestamp,
  arrayUnion,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import DiscountModal from "./DiscountModal";
import ReactDOM from "react-dom";
import { getStorage } from "firebase/storage";
import { db } from "../../firebase.config";
import toast from "react-hot-toast";
import { RotatingLines } from "react-loader-spinner";
import { GoTrash } from "react-icons/go";
import { FiGift, FiPlus, FiX } from "react-icons/fi";
import SubProduct from "./SubProduct";
import productTypes from "./producttype";
import productSizes from "./productsizes";
import everydayType from "./everydayType";
import { LuBadgeInfo } from "react-icons/lu";
import { usePostHog } from "posthog-js/react";
import { PALETTE, PALETTE_ORDER } from "../../services/pallete";
import NativePickerField from "../../components/Form/NativePickerField";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import { appHaptics } from "../../services/haptics";
import {
  IMPLICIT_ONE_SIZE,
  LISTING_SIZE_KINDS,
  createSizeRef,
  createListingSizingMetadata,
  getLegacyCatalogSizes,
  getListingSizeOptions,
  getListingSizingProfile,
  getSizeSystemLabel,
  getSizingSpec,
} from "../../config/sizingV1";
import {
  crossesNoSizeProfileBoundary,
  filterPristineTrailingSizeRows,
  hasVariantDraft,
} from "../../services/vendorProductForm";
import {
  buildProductTypePickerOptions,
  filterProductTypeOptionsForAudience,
  getExplicitAudienceForProductType,
} from "../../services/productTaxonomyPresentation";
import {
  createProductImagePreview,
  deleteProductImageRefs,
  prepareProductImage,
  safeStorageFileName,
  uploadProductImageBatch,
} from "../../services/productImagePipeline";
import {
  clearAddProductDraft,
  clearAddProductDraftImages,
  createAddProductDraft,
  hasMeaningfulAddProductDraft,
  loadAddProductDraft,
  loadAddProductDraftImages,
  saveAddProductDraft,
  saveAddProductDraftImages,
} from "./add-product/addProductDraft";
import AddProductDraftNotice from "./add-product/AddProductDraftNotice";
import ProductClassificationFields from "./add-product/ProductClassificationFields";
import ProductDetailsFields from "./add-product/ProductDetailsFields";
import ProductImagesSection from "./add-product/ProductImagesSection";
import ProductPricingFields from "./add-product/ProductPricingFields";
import ProductPublishProgress from "./add-product/ProductPublishProgress";
import ProductParcelEstimateField from "./add-product/ProductParcelEstimateField";
import ProductClassificationSuggestion from "./add-product/ProductClassificationSuggestion";
import PaletteColorSheet from "./add-product/PaletteColorSheet";
import {
  analyzeProductImageLabels,
  canAnalyzeProductImages,
} from "../../services/productImageAnalysis";
import {
  buildImageLabelTagSuggestions,
  rankProductTaxonomySuggestions,
} from "../../services/productTaxonomyInference.mjs";
import {
  getProductParcelPresentation,
  isParcelSizeSelectionSafe,
} from "../../services/productParcelPresentation";

const MAX_TAGS = 10;
const TAG_MEMORY_PREFIX = "mythrift:vendor-tag-memory:";
const VARIANT_PHOTO_TIP_PREFIX = "mythrift:variant-photo-tip:hidden:";
const TAG_STOP_WORDS = new Set([
  "with",
  "from",
  "this",
  "that",
  "item",
  "product",
  "brand",
  "size",
  "colour",
  "color",
]);

const cleanTag = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^#+/, "")
    .trim()
    .slice(0, 32);

const titleCaseTag = (value) =>
  cleanTag(value)
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

const waitForBrowserPaint = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });

const waitForPickerDismissal = async () => {
  await waitForBrowserPaint();
  await new Promise((resolve) => window.setTimeout(resolve, 180));
};

const createLocalImageId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `image-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const materializeImplicitSizeVariants = (variants) =>
  (variants || []).map((variant) => ({
    ...variant,
    sizes: [
      {
        ...(variant.sizes?.[0] || {}),
        size: IMPLICIT_ONE_SIZE,
        sizeRef: null,
        isActive: true,
      },
    ],
  }));

const AddProduct = ({ vendorId, closeModal, onBusyChange }) => {
  const posthog = usePostHog();
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [productCondition, setProductCondition] = useState("");
  const [productDefectDescription, setProductDefectDescription] = useState("");
  const [category, setCategory] = useState("");
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedSubType, setSelectedSubType] = useState(null);
  const sizeTaxonomyOriginRef = useRef(null);
  const [productVariants, setProductVariants] = useState([
    { color: "", sizes: [{ size: "", stock: "" }] },
  ]);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [variantPhotoTipDismissed, setVariantPhotoTipDismissed] =
    useState(false);
  const [variantPhotoTipSuppressed, setVariantPhotoTipSuppressed] =
    useState(false);
  const [neverShowVariantPhotoTipAgain, setNeverShowVariantPhotoTipAgain] =
    useState(false);
  const [itemClass, setItemClass] = useState(
    () => localStorage.getItem("matildaItemClass") || "fashion"
  );

  const [sizeOptions, setSizeOptions] = useState([]);

  const [productImages, setProductImages] = useState([]);
  const productImagesRef = useRef([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const formScrollContainerRef = useRef(null);

  const [vendorProfile, setVendorProfile] = useState(null);
  const MAX_IMAGES = 8;
  const [tags, setTags] = useState([]); // State to store tags
  const [tagInput, setTagInput] = useState(""); // State to manage tag input
  const [learnedTags, setLearnedTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageTask, setImageTask] = useState(null);
  const [imageClassification, setImageClassification] = useState({
    status: "idle",
    suggestions: [],
    labels: [],
    tagSuggestions: [],
    appliedSuggestion: null,
    aiSuggestedFields: [],
    feedback: null,
  });
  const imageAnalysisGenerationRef = useRef(0);
  const imageAnalysisAbortRef = useRef(null);
  const classificationRevisionRef = useRef(0);
  const classificationLockedByVendorRef = useRef(false);
  const publishLockRef = useRef(false);
  const draftHydratedVendorRef = useRef(null);
  const skipNextDraftSaveRef = useRef(false);
  const latestDraftRef = useRef(null);
  const suppressDraftSaveRef = useRef(false);
  const restoredImageCountRef = useRef(0);
  const draftImageSaveChainRef = useRef(Promise.resolve());
  const [draftImagesHydrated, setDraftImagesHydrated] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftRequiresImages, setDraftRequiresImages] = useState(false);
  const [invalidField, setInvalidField] = useState(null);
  const [hasVariations, setHasVariations] = useState(false);
  const [showSubProductModal, setShowSubProductModal] = useState(false);
  const [availableSizes, setAvailableSizes] = useState([]); // Ensure size dropdown syncs with this
  const [subProducts, setSubProducts] = useState([]);
  const subProductsRef = useRef([]);
  const [runDiscount, setRunDiscount] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isPriceDisabled, setIsPriceDisabled] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [discountDetails, setDiscountDetails] = useState(null); // Store discount details
  const [parcelSize, setParcelSize] = useState("");
  const [parcelSizeSource, setParcelSizeSource] = useState("taxonomy-default");
  const isProductFlowBusy =
    isLoading || isPreparingImages || isUploadingImage;
  useEffect(() => {
    onBusyChange?.(isProductFlowBusy);
  }, [isProductFlowBusy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  useEffect(
    () => () => {
      imageAnalysisGenerationRef.current += 1;
      imageAnalysisAbortRef.current?.abort();
      imageAnalysisAbortRef.current = null;
    },
    [],
  );
  useEffect(() => {
    productImagesRef.current = productImages;
  }, [productImages]);
  useEffect(() => {
    subProductsRef.current = subProducts;
  }, [subProducts]);
  useEffect(
    () => () => {
      productImagesRef.current.forEach(({ preview }) => {
        if (preview) URL.revokeObjectURL(preview);
      });
      subProductsRef.current.forEach((subProduct) => {
        (subProduct.images || []).forEach((image) => {
          if (image?.preview) URL.revokeObjectURL(image.preview);
        });
      });
    },
    [],
  );

  const resetProductForm = () => {
    imageAnalysisGenerationRef.current += 1;
    imageAnalysisAbortRef.current?.abort();
    imageAnalysisAbortRef.current = null;
    classificationRevisionRef.current += 1;
    classificationLockedByVendorRef.current = false;
    productImagesRef.current.forEach(({ preview }) => {
      if (preview) URL.revokeObjectURL(preview);
    });
    subProductsRef.current.forEach((subProduct) => {
      (subProduct.images || []).forEach((image) => {
        if (image?.preview) URL.revokeObjectURL(image.preview);
      });
    });
    productImagesRef.current = [];
    subProductsRef.current = [];

    setProductName("");
    setProductDescription("");
    setProductPrice("");
    setStockQuantity("");
    setProductCondition("");
    setProductDefectDescription("");
    setCategory(itemClass === "everyday" ? "all" : "");
    setSelectedProductType(null);
    setSelectedSubType(null);
    setProductVariants([
      { color: "", sizes: [{ size: "", stock: "", isActive: true }] },
    ]);
    setProductImages([]);
    setCurrentImageIndex(0);
    setTags([]);
    setTagInput("");
    setHasVariations(false);
    setShowSubProductModal(false);
    setAvailableSizes([]);
    setSubProducts([]);
    setRunDiscount(false);
    setIsDiscountModalOpen(false);
    setDiscountDetails(null);
    setIsPriceDisabled(false);
    setParcelSize("");
    setParcelSizeSource("taxonomy-default");
    setDraftRequiresImages(false);
    restoredImageCountRef.current = 0;
    setInvalidField(null);
    setImageClassification({
      status: "idle",
      suggestions: [],
      labels: [],
      tagSuggestions: [],
      appliedSuggestion: null,
      aiSuggestedFields: [],
      feedback: null,
    });
  };

  const markClassificationManual = (fields = []) => {
    classificationRevisionRef.current += 1;
    classificationLockedByVendorRef.current = true;
    if (imageClassification.status === "analyzing") {
      imageAnalysisGenerationRef.current += 1;
      imageAnalysisAbortRef.current?.abort();
      imageAnalysisAbortRef.current = null;
    }
    const changed = new Set(fields);
    setImageClassification((current) => ({
      ...current,
      status: current.status === "analyzing" ? "idle" : current.status,
      aiSuggestedFields: (current.aiSuggestedFields || []).filter(
        (field) => !changed.has(field),
      ),
    }));
  };

  const analyzeFirstProductImage = async (file) => {
    if (!canAnalyzeProductImages() || !(file instanceof Blob)) return;

    const generation = imageAnalysisGenerationRef.current + 1;
    const classificationRevision = classificationRevisionRef.current;
    const analysisId = `${Date.now()}-${generation}`;
    const startedAt = performance.now();
    imageAnalysisGenerationRef.current = generation;
    imageAnalysisAbortRef.current?.abort();
    const controller = new AbortController();
    imageAnalysisAbortRef.current = controller;
    setImageClassification((current) => ({
      ...current,
      status: "analyzing",
      suggestions: [],
      labels: [],
      tagSuggestions: [],
      appliedSuggestion: null,
      aiSuggestedFields: [],
      feedback: null,
      analysisId,
    }));

    try {
      const labels = await analyzeProductImageLabels(file, {
        signal: controller.signal,
      });
      if (
        controller.signal.aborted ||
        generation !== imageAnalysisGenerationRef.current
      ) {
        return;
      }
      const suggestions = rankProductTaxonomySuggestions({
        labels,
        fashionTypes: productTypes,
        everydayTypes: everydayType,
        limit: 3,
      });
      const tagSuggestions = buildImageLabelTagSuggestions(labels, { limit: 8 });
      const primary = suggestions[0] || null;
      const inferredAudience =
        primary?.itemClass === "fashion"
          ? primary.category ||
            getExplicitAudienceForProductType(primary.productType)
          : "all";
      const enrichedPrimary = primary
        ? { ...primary, category: inferredAudience }
        : null;
      let appliedSuggestion = null;
      let aiSuggestedFields = [];

      // Manual choices always win. We only commit the result when the vendor
      // has not changed classification since this image analysis started.
      if (
        enrichedPrimary &&
        classificationRevision === classificationRevisionRef.current &&
        !classificationLockedByVendorRef.current
      ) {
        const accepted = handleClassificationChange({
          itemClass: enrichedPrimary.itemClass,
          category:
            enrichedPrimary.itemClass === "fashion"
              ? enrichedPrimary.category || ""
              : "all",
          productTypeValue: enrichedPrimary.productType,
          subTypeValue: enrichedPrimary.subType || "",
          allowIncompleteSubType: true,
          source: "image-suggestion",
        });
        if (accepted) {
          appliedSuggestion = enrichedPrimary;
          aiSuggestedFields = ["itemClass", "productType"];
          if (enrichedPrimary.subType) aiSuggestedFields.push("subType");
          if (enrichedPrimary.category) aiSuggestedFields.push("category");
          void appHaptics.success();
        }
      }

      setImageClassification({
        status: suggestions.length ? "ready" : "idle",
        suggestions,
        labels,
        tagSuggestions,
        appliedSuggestion,
        aiSuggestedFields,
        feedback: null,
        analysisId,
      });
      posthog?.capture("product_image_classification_suggested", {
        analysis_id: analysisId,
        suggestion_available: Boolean(primary),
        suggestion_applied: Boolean(appliedSuggestion),
        suggested_item_class: enrichedPrimary?.itemClass || null,
        suggested_product_type: enrichedPrimary?.productType || null,
        suggested_sub_type: enrichedPrimary?.subType || null,
        suggested_category: enrichedPrimary?.category || null,
        tag_suggestion_count: tagSuggestions.length,
        duration_ms: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.info("[product-image-analysis] suggestion unavailable", {
          code: error?.code || "unknown",
          message: error?.message || String(error),
        });
      }
      if (generation === imageAnalysisGenerationRef.current) {
        setImageClassification((current) => ({
          ...current,
          status: "idle",
          suggestions: [],
          labels: [],
          tagSuggestions: [],
          appliedSuggestion: null,
          aiSuggestedFields: [],
          feedback: null,
        }));
      }
    } finally {
      if (generation === imageAnalysisGenerationRef.current) {
        imageAnalysisAbortRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!vendorId) return;

    let cancelled = false;
    suppressDraftSaveRef.current = false;
    draftHydratedVendorRef.current = vendorId;
    skipNextDraftSaveRef.current = true;
    setDraftImagesHydrated(false);
    const draft = loadAddProductDraft(vendorId);
    const hasDraft = hasMeaningfulAddProductDraft(draft);

    if (!hasDraft) {
      classificationLockedByVendorRef.current = false;
      latestDraftRef.current = null;
      restoredImageCountRef.current = 0;
      setDraftRestored(false);
      setDraftRequiresImages(false);
      setDraftImagesHydrated(true);
      return () => {
        cancelled = true;
      };
    }

    setItemClass(draft.itemClass || "fashion");
    setProductName(draft.productName || "");
    setProductDescription(draft.productDescription || "");
    setProductPrice(draft.productPrice || "");
    setStockQuantity(draft.stockQuantity || "");
    setProductCondition(draft.productCondition || "");
    setProductDefectDescription(draft.productDefectDescription || "");
    setCategory(
      (draft.itemClass || "fashion") === "everyday"
        ? "all"
        : draft.category || "",
    );
    setSelectedProductType(draft.selectedProductType || null);
    setSelectedSubType(draft.selectedSubType || null);
    classificationLockedByVendorRef.current = Boolean(
      draft.selectedProductType?.value || draft.selectedSubType?.value,
    );
    setProductVariants(
      draft.productVariants?.length
        ? draft.productVariants
        : [{ color: "", sizes: [{ size: "", stock: "", isActive: true }] }],
    );
    setTags(Array.isArray(draft.tags) ? draft.tags.slice(0, MAX_TAGS) : []);
    setHasVariations(draft.hasVariations === true);
    setSubProducts(Array.isArray(draft.subProducts) ? draft.subProducts : []);
    setDiscountDetails(draft.discountDetails || null);
    setRunDiscount(draft.runDiscount === true || Boolean(draft.discountDetails));
    setParcelSize(draft.parcelSize || "");
    setParcelSizeSource(
      draft.parcelSizeSource === "vendor-confirmed"
        ? "vendor-confirmed"
        : "taxonomy-default",
    );
    const missingDraftImageCount =
      Number(draft.productImageCount || 0) +
      (draft.subProducts || []).reduce(
        (total, subProduct) =>
          total + Number(subProduct?.draftImageCount || 0),
        0,
      );
    restoredImageCountRef.current = Number(draft.productImageCount || 0);
    setDraftRequiresImages(missingDraftImageCount > 0);
    setDraftRestored(true);
    latestDraftRef.current = draft;

    void loadAddProductDraftImages(vendorId)
      .then((savedImages) => {
        if (cancelled) return;
        const restoredMainImages = (savedImages?.mainImages || []).map(
          (entry) => ({
            ...createProductImagePreview(entry.file),
            id: createLocalImageId(),
            status: "ready",
            originalBytes: entry.originalBytes,
            storedBytes: entry.storedBytes,
            wasOptimized: entry.wasOptimized,
          }),
        );
        const variationMap = new Map(
          (savedImages?.variationImages || []).map((variation) => [
            variation.subProductId,
            variation.images,
          ]),
        );
        const restoredSubProducts = (draft.subProducts || []).map(
          (subProduct) => ({
            ...subProduct,
            images: (variationMap.get(subProduct.subProductId) || []).map(
              (entry) => ({
                ...createProductImagePreview(entry.file),
                id: createLocalImageId(),
                status: "ready",
                originalBytes: entry.originalBytes,
                storedBytes: entry.storedBytes,
                wasOptimized: entry.wasOptimized,
              }),
            ),
          }),
        );
        const restoredCount =
          restoredMainImages.length +
          restoredSubProducts.reduce(
            (total, subProduct) => total + (subProduct.images?.length || 0),
            0,
          );
        setProductImages(restoredMainImages);
        setSubProducts(restoredSubProducts);
        setDraftRequiresImages(restoredCount < missingDraftImageCount);
        if (restoredMainImages.length >= Number(draft.productImageCount || 0)) {
          restoredImageCountRef.current = 0;
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("[AddProductDraft] Draft images could not be restored", {
            code: error?.name || "storage-unavailable",
          });
          setDraftRequiresImages(missingDraftImageCount > 0);
        }
      })
      .finally(() => {
        if (cancelled) return;
        setDraftImagesHydrated(true);
        window.setTimeout(() => void appHaptics.success(), 160);
      });

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId || draftHydratedVendorRef.current !== vendorId) return;

    const draft = createAddProductDraft({
      vendorId,
      itemClass,
      productName,
      productDescription,
      productPrice,
      stockQuantity,
      productCondition,
      productDefectDescription,
      category,
      selectedProductType,
      selectedSubType,
      productVariants,
      tags,
      hasVariations,
      subProducts,
      discountDetails,
      runDiscount,
      productImageCount: productImages.length,
      parcelSize,
      parcelSizeSource,
    });
    latestDraftRef.current = draft;

    if (suppressDraftSaveRef.current || isLoading) return;
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveAddProductDraft(draft);
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [
    category,
    discountDetails,
    hasVariations,
    isLoading,
    itemClass,
    productCondition,
    productDefectDescription,
    productDescription,
    productImages.length,
    productName,
    productPrice,
    productVariants,
    parcelSize,
    parcelSizeSource,
    runDiscount,
    selectedProductType,
    selectedSubType,
    stockQuantity,
    subProducts,
    tags,
    vendorId,
  ]);

  useEffect(() => {
    if (
      !vendorId ||
      !draftImagesHydrated ||
      suppressDraftSaveRef.current ||
      isLoading ||
      productImages.some((image) => image?.status === "preparing")
    ) {
      return;
    }

    const readyProductImages = productImages.filter(
      (image) => image?.status !== "preparing" && image?.file instanceof Blob,
    );
    const readySubProducts = subProducts.map((subProduct) => ({
      ...subProduct,
      images: (subProduct.images || []).filter(
        (image) => image?.file instanceof Blob,
      ),
    }));
    const timeoutId = window.setTimeout(() => {
      draftImageSaveChainRef.current = draftImageSaveChainRef.current
        .catch(() => undefined)
        .then(() =>
          saveAddProductDraftImages({
            vendorId,
            productImages: readyProductImages,
            subProducts: readySubProducts,
          }),
        )
        .catch((error) => {
          console.warn("[AddProductDraft] Draft images could not be saved", {
            code: error?.name || "storage-unavailable",
          });
        });
    }, 900);
    return () => window.clearTimeout(timeoutId);
  }, [
    draftImagesHydrated,
    isLoading,
    productImages,
    subProducts,
    vendorId,
  ]);

  useEffect(
    () => () => {
      const draft = latestDraftRef.current;
      if (!suppressDraftSaveRef.current && draft?.vendorId === String(vendorId)) {
        saveAddProductDraft(draft);
      }
    },
    [vendorId],
  );

  useEffect(() => {
    const flushDraft = () => {
      const draft = latestDraftRef.current;
      if (
        !suppressDraftSaveRef.current &&
        draft?.vendorId === String(vendorId)
      ) {
        saveAddProductDraft(draft);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushDraft();
    };

    window.addEventListener("pagehide", flushDraft);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flushDraft);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [vendorId]);

  const discardSavedDraft = () => {
    if (
      !window.confirm(
        "Discard this saved listing draft? This cannot be undone.",
      )
    ) {
      return;
    }
    clearAddProductDraft(vendorId);
    void clearAddProductDraftImages(vendorId).catch((error) => {
      console.warn("[AddProductDraft] Draft images could not be cleared", {
        code: error?.name || "storage-unavailable",
      });
    });
    latestDraftRef.current = null;
    skipNextDraftSaveRef.current = true;
    resetProductForm();
    setDraftRestored(false);
    void appHaptics.success();
    toast.success("Draft discarded");
  };
const paletteSwatches = React.useMemo(() => {
  return PALETTE_ORDER.map((key) => ({
    key,
    ...PALETTE[key],
  })).filter((x) => x && x.key);
}, []);

const colorLabelMap = React.useMemo(() => {
  const m = new Map();
  PALETTE_ORDER.forEach((k) => {
    const item = PALETTE?.[k];
    if (item?.label) m.set(k, item.label);
  });
  return m;
}, []);

const [colorSheetOpen, setColorSheetOpen] = useState(false);
const [activeColorIndex, setActiveColorIndex] = useState(null);

const selectedSizingProfile = React.useMemo(
  () =>
    itemClass === "fashion"
      ? getListingSizingProfile(
          selectedProductType?.value,
          selectedSubType?.value,
        )
      : null,
  [itemClass, selectedProductType?.value, selectedSubType?.value],
);
const parcelRecommendation = React.useMemo(
  () =>
    getProductParcelPresentation({
      itemClass,
      productType: selectedProductType?.value,
      subType: selectedSubType?.value,
    }),
  [itemClass, selectedProductType?.value, selectedSubType?.value],
);
useEffect(() => {
  if (!parcelRecommendation) {
    setParcelSize("");
    setParcelSizeSource("taxonomy-default");
    return;
  }
  if (
    !parcelSize ||
    parcelSizeSource === "taxonomy-default" ||
    !isParcelSizeSelectionSafe(parcelSize, parcelRecommendation)
  ) {
    setParcelSize(parcelRecommendation.key);
    setParcelSizeSource("taxonomy-default");
  }
}, [parcelRecommendation, parcelSize, parcelSizeSource]);
const isNoSizeProfile =
  selectedSizingProfile?.kind === LISTING_SIZE_KINDS.NONE;
const hasSingleConfiguredVariant =
  productVariants.length === 1 && Boolean(productVariants[0]?.color);
const hasVariantPhotoWarningCase =
  itemClass === "fashion" &&
  productImages.length >= 3 &&
  hasSingleConfiguredVariant;
const showVariantPhotoWarning =
  hasVariantPhotoWarningCase &&
  !variantPhotoTipDismissed &&
  !variantPhotoTipSuppressed;
const openColorSheet = (idx) => {
  void appHaptics.selection();
  setActiveColorIndex(idx);
  setColorSheetOpen(true);
};

const closeColorSheet = () => {
  setColorSheetOpen(false);
  setActiveColorIndex(null);
};

const selectVariantColor = (paletteKey) => {
  if (activeColorIndex === null) return;

  void appHaptics.selection();
  clearValidationError(`variant-color-${activeColorIndex}`);

  setProductVariants((prev) => {
    const next = [...prev];
    if (!next[activeColorIndex]) return prev;
    next[activeColorIndex] = { ...next[activeColorIndex], color: paletteKey };
    return next;
  });

  closeColorSheet();
};

  const storage = getStorage();
  useEffect(() => {
    const fetchVendorName = async () => {
      if (currentUser) {
        const vendorDocRef = doc(db, "vendors", vendorId);
        const vendorDoc = await getDoc(vendorDocRef);

        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          setVendorProfile(vendorData);
        } else {
          setVendorProfile(null);
        }
      }
    };

    fetchVendorName();
  }, [currentUser, vendorId]);
  useEffect(() => {}, []);
  useEffect(() => {
    if (!hasVariations) {
      setSubProducts([]);
    }
  }, [hasVariations]);
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        toast.error("No user is signed in.");
      }
    });

    return () => unsubscribe();
  }, []);
  useEffect(() => {
    if (!vendorId) return;
    try {
      const stored = JSON.parse(
        localStorage.getItem(`${TAG_MEMORY_PREFIX}${vendorId}`) || "{}",
      );
      const rankedTags = Object.entries(stored)
        .filter(([tag, count]) => cleanTag(tag) && Number(count) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 20)
        .map(([tag]) => titleCaseTag(tag));
      setLearnedTags(rankedTags);
    } catch (error) {
      console.warn("[AddProduct] Could not restore learned tags", error);
      setLearnedTags([]);
    }
  }, [vendorId]);
  useEffect(() => {
    setVariantPhotoTipDismissed(false);
    setNeverShowVariantPhotoTipAgain(false);
    if (!vendorId) {
      setVariantPhotoTipSuppressed(false);
      return;
    }

    try {
      setVariantPhotoTipSuppressed(
        localStorage.getItem(`${VARIANT_PHOTO_TIP_PREFIX}${vendorId}`) ===
          "hidden",
      );
    } catch (error) {
      console.warn("[AddProduct] Could not restore the variant photo tip", error);
      setVariantPhotoTipSuppressed(false);
    }
  }, [vendorId]);
  useEffect(() => {
    if (hasVariantPhotoWarningCase) return;
    setVariantPhotoTipDismissed(false);
    setNeverShowVariantPhotoTipAgain(false);
  }, [hasVariantPhotoWarningCase]);
  useEffect(() => {
    if (selectedProductType && selectedSubType) {
      const productTypeValue = selectedProductType.value.trim();
      const subTypeValue = selectedSubType.value.trim();
      const legacySizes = getLegacyCatalogSizes(
        productSizes,
        productTypeValue,
        subTypeValue,
      );
      const subTypeSizes = getListingSizeOptions({
        productType: productTypeValue,
        subType: subTypeValue,
        legacySizes,
      });

      if (subTypeSizes && subTypeSizes.length > 0) {
        const options = subTypeSizes.map((size) => ({
          label: size,
          value: size,
        }));
        setSizeOptions(options);
        setAvailableSizes(subTypeSizes);
      } else {
        setSizeOptions([]);
        setAvailableSizes([]);
      }
    } else {
      setSizeOptions([]);
      setAvailableSizes([]);
    }
  }, [selectedProductType, selectedSubType]);
  useEffect(() => {
    if (!isNoSizeProfile) return;
    setProductVariants((previous) =>
      materializeImplicitSizeVariants(previous),
    );
  }, [isNoSizeProfile, selectedProductType?.value, selectedSubType?.value]);
  const openDiscountModal = () => {
    setIsDiscountModalOpen(true);
  };
  useEffect(() => {
    if (
      discountDetails &&
      (discountDetails.discountType.startsWith("inApp") ||
        discountDetails.discountType === "personal-monetary")
    ) {
      // Automatically update product price to be the discount price
      setProductPrice(discountDetails.discountPrice.toString());
      setIsPriceDisabled(true);
    } else {
      setIsPriceDisabled(false);
    }
  }, [discountDetails]);
  const closeDiscountModal = (isCancelled = false) => {
    setIsDiscountModalOpen(false);
    if (isCancelled) {
      setRunDiscount(false); // turn radio back to “No”
      setDiscountDetails(null); // forget draft
    }
  };

  useEffect(() => {
    localStorage.setItem("matildaItemClass", itemClass);
  }, [itemClass]);

  const handleSaveDiscount = (details) => {
    setDiscountDetails(details);
    setRunDiscount(true);
    // For monetary discounts, update product price and disable input
    if (
      details.discountType.startsWith("inApp") ||
      details.discountType === "personal-monetary"
    ) {
      setProductPrice(details.discountPrice.toString());
      setIsPriceDisabled(true);
    }
    closeDiscountModal(false);
  };

  const getVariantSizeEntries = () =>
    productVariants.flatMap((variant) =>
      (variant.sizes || []).filter((entry) => entry.size),
    );
  const getVariantSizeValues = () =>
    getVariantSizeEntries().map((entry) => entry.size);
  const hasVariantSizingDraft = () =>
    hasVariantDraft(productVariants, subProducts);

  const resetSizesForNewTaxonomy = () => {
    setProductVariants((previous) =>
      previous.map((variant) => ({
        ...variant,
        sizes: [{ size: "", stock: "", isActive: true }],
      })),
    );
    setHasVariations(false);
    setSubProducts([]);
  };

  const confirmIncompatibleSizeReset = ({
    nextType,
    nextSubType,
    fromType = selectedProductType?.value,
    fromSubType = selectedSubType?.value,
  }) => {
    const currentProfile = getListingSizingProfile(fromType, fromSubType);
    const nextProfile = getListingSizingProfile(nextType, nextSubType);
    const hasTaxonomyBoundary = Boolean(
      String(fromType || "").trim() && String(nextType || "").trim(),
    );
    if (
      hasTaxonomyBoundary &&
      crossesNoSizeProfileBoundary(currentProfile, nextProfile)
    ) {
      const shouldReset = window.confirm(
        "This change adds or removes size selection. Continue and clear the existing sizes, stock, and variations?",
      );
      if (shouldReset) resetSizesForNewTaxonomy();
      return shouldReset;
    }

    if (!hasVariantSizingDraft()) return true;
    const selectedSizes = getVariantSizeValues();
    if (!selectedSizes.length) {
      const shouldReset = window.confirm(
        "This product type may not support the existing variant details. Continue and reselect the sizes, stock, and variations?",
      );
      if (shouldReset) resetSizesForNewTaxonomy();
      return shouldReset;
    }

    const sizeEntries = getVariantSizeEntries();
    const currentRefs = sizeEntries.map(
      (entry) =>
        entry.sizeRef ||
        createSizeRef(entry.size, fromType, fromSubType, { source: "forward" }),
    );
    const nextRefs = sizeEntries.map((entry) =>
      createSizeRef(entry.size, nextType, nextSubType, { source: "forward" }),
    );
    const currentSpec = getSizingSpec(fromType, fromSubType);
    const nextSpec = getSizingSpec(nextType, nextSubType);
    const sameKnownSizingSystem = Boolean(
      (currentSpec &&
        nextSpec &&
        currentSpec.fitDomain === nextSpec.fitDomain &&
        currentSpec.system === nextSpec.system) ||
        (currentProfile?.kind === LISTING_SIZE_KINDS.NONE &&
          nextProfile?.kind === LISTING_SIZE_KINDS.NONE) ||
        (currentProfile?.kind === LISTING_SIZE_KINDS.FIT_MODE &&
          nextProfile?.kind === LISTING_SIZE_KINDS.FIT_MODE),
    );
    const nextLegacySizes = new Set(
      getLegacyCatalogSizes(productSizes, nextType, nextSubType),
    );
    const compatible = currentRefs.every(
      (currentRef, index) => {
        const nextRef = nextRefs[index];
        if (currentRef && nextRef) {
          return (
            currentRef.fitDomain === nextRef.fitDomain &&
            currentRef.system === nextRef.system
          );
        }
        // Some legacy labels (for example UK 12 or 12-14) cannot be safely
        // canonicalised. They are still safe to retain when both taxonomies
        // explicitly use the same domain/system. Neutral specialist catalogs
        // retain a value only when the next catalog explicitly contains it.
        if (!currentRef && !nextRef) {
          return (
            sameKnownSizingSystem ||
            nextLegacySizes.has(sizeEntries[index].size)
          );
        }
        return false;
      },
    );
    if (compatible) return true;

    const shouldReset = window.confirm(
      "This product type uses a different sizing system. Continue and reselect the sizes and stock for each colour?",
    );
    if (shouldReset) resetSizesForNewTaxonomy();
    return shouldReset;
  };

  // Product types with a single fit domain can be validated immediately. Mixed
  // types (for example Corporate Women) are validated when subtype is chosen.
  const handleProductTypeChange = (selectedOption) => {
    if (!selectedOption) {
      setSelectedProductType(null);
      setSelectedSubType(null);
      return true;
    }
    if (selectedOption.value === selectedProductType?.value) return false;
    const previousTaxonomy = sizeTaxonomyOriginRef.current || {
      type: selectedProductType?.value,
      subType: selectedSubType?.value,
    };
    const hasKnownTarget = Boolean(
      getListingSizingProfile(selectedOption.value, ""),
    );
    if (
      hasKnownTarget &&
      !confirmIncompatibleSizeReset({
        nextType: selectedOption.value,
        nextSubType: "",
        fromType: previousTaxonomy.type,
        fromSubType: previousTaxonomy.subType,
      })
    ) {
      return false;
    }
    sizeTaxonomyOriginRef.current = hasKnownTarget ? null : previousTaxonomy;
    setSelectedProductType(selectedOption);
    setSelectedSubType(null);
    return true;
  };

  const handleProductSubTypeChange = (selectedOption) => {
    if (!selectedOption) {
      setSelectedSubType(null);
      return;
    }
    if (selectedOption.value === selectedSubType?.value) return;
    const origin = sizeTaxonomyOriginRef.current;
    if (
      !confirmIncompatibleSizeReset({
        nextType: selectedProductType?.value,
        nextSubType: selectedOption.value,
        fromType: origin?.type || selectedProductType?.value,
        fromSubType: origin?.subType || selectedSubType?.value,
      })
    ) {
      return;
    }
    sizeTaxonomyOriginRef.current = null;
    setSelectedSubType(selectedOption);
  };

  // Log the subTypeOptions array
  const subTypeOptions =
    selectedProductType?.subTypes.map((subType) =>
      typeof subType === "string"
        ? { label: subType, value: subType }
        : { label: subType.name, value: subType.name }
    ) || [];

  // const handleFileChange = async (e) => {
  //   const files = Array.from(e.target.files);
  //   const validFiles = [];

  //   files.forEach((file) => {
  //     if (file.size <= MAX_FILE_SIZE) {
  //       validFiles.push(file);
  //     } else {
  //       toast.error(`${file.name} exceeds the maximum file size of 3MB.`);
  //     }
  //   });

  //   if (validFiles.length + productImages.length > 4) {
  //     toast.error("You can only upload a maximum of 4 images.");
  //     return;
  //   }

  //   setProductImages((prevImages) => [...prevImages, ...validFiles]);
  // };

  useEffect(() => {
    if (hasVariations && !showSubProductModal) {
      setShowSubProductModal(true);
    }
  }, [hasVariations]); // ⚠️ add showSubProductModal to lint if you use eslint

  const handleRemoveImage = (index) => {
    void appHaptics.selection();
    const removedPreview = productImages[index]?.preview;
    if (removedPreview) URL.revokeObjectURL(removedPreview);
    const updatedImages = productImages.filter((_, i) => i !== index);
    setProductImages(updatedImages);

    if (index === 0) {
      imageAnalysisGenerationRef.current += 1;
      imageAnalysisAbortRef.current?.abort();
      imageAnalysisAbortRef.current = null;
      setImageClassification({
        status: "idle",
        suggestions: [],
        labels: [],
        tagSuggestions: [],
        appliedSuggestion: null,
        aiSuggestedFields: [],
        feedback: null,
      });
      if (updatedImages[0]?.file) {
        void analyzeFirstProductImage(updatedImages[0].file);
      }
    }

    if (index === currentImageIndex && updatedImages.length > 0) {
      setCurrentImageIndex(0);
    }
  };

  const handleDotClick = (index) => {
    void appHaptics.selection();
    setCurrentImageIndex(index);
    const scrollWidth = scrollContainerRef.current.offsetWidth;
    scrollContainerRef.current.scrollTo({
      left: scrollWidth * index,
      behavior: "smooth",
    });
  };
  const handleScroll = () => {
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const scrollWidth = scrollContainerRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / scrollWidth);
    setCurrentImageIndex(newIndex);
  };

  const addTag = (rawTag) => {
    const nextTag = titleCaseTag(rawTag);
    if (!nextTag) return false;
    if (tags.length >= MAX_TAGS) {
      void appHaptics.warning();
      toast.error(`You can add up to ${MAX_TAGS} tags.`);
      return false;
    }
    if (tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
      return false;
    }
    setTags((current) => [...current, nextTag]);
    void appHaptics.selection();
    return true;
  };

  const removeTag = (tagToRemove) => {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
    void appHaptics.selection();
  };

  const rememberCurrentTags = () => {
    if (!vendorId || !tags.length) return;
    try {
      const key = `${TAG_MEMORY_PREFIX}${vendorId}`;
      const stored = JSON.parse(localStorage.getItem(key) || "{}");
      tags.forEach((tag) => {
        const normalized = titleCaseTag(tag);
        if (normalized) stored[normalized] = Number(stored[normalized] || 0) + 1;
      });
      const compact = Object.fromEntries(
        Object.entries(stored)
          .sort((a, b) => Number(b[1]) - Number(a[1]))
          .slice(0, 40),
      );
      localStorage.setItem(key, JSON.stringify(compact));
      setLearnedTags(Object.keys(compact).slice(0, 20));
    } catch (error) {
      console.warn("[AddProduct] Could not remember product tags", error);
    }
  };

  const handleTagInputChange = (e) => {
    const value = e.target.value;
    if (value.includes(",")) {
      const existing = new Set(tags.map((tag) => tag.toLowerCase()));
      const batchSeen = new Set();
      const candidates = value
        .split(",")
        .map(titleCaseTag)
        .filter((tag) => {
          const key = tag.toLowerCase();
          if (!tag || existing.has(key) || batchSeen.has(key)) return false;
          batchSeen.add(key);
          return true;
        });
      const accepted = candidates.slice(0, Math.max(0, MAX_TAGS - tags.length));
      if (accepted.length) {
        setTags((current) => [...current, ...accepted]);
        void appHaptics.selection();
      }
      if (accepted.length < candidates.length) {
        void appHaptics.warning();
        toast.error(`You can add up to ${MAX_TAGS} tags.`);
      }
      setTagInput("");
    } else {
      setTagInput(value);
    }
  };

  const handleTagKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      if (addTag(tagInput)) setTagInput("");
      return;
    }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  };
  // const handleMultipleFileChange = (e) => {
  //   const files = Array.from(e.target.files);
  //   if (additionalImages.length + files.length > MAX_IMAGES - 1) {
  //     alert("You can upload a maximum of 4 images");
  //     return;
  //   }
  //   setAdditionalImages([...additionalImages, ...files]);
  // };

  const addSizeUnderColor = (colorIndex) => {
    const updatedVariants = [...productVariants];
    updatedVariants[colorIndex].sizes.push({
      size: "",
      stock: "",
      isActive: false,
    });
    setProductVariants(updatedVariants);
  };
  const openInfoModal = () => {
    void appHaptics.selection();
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    void appHaptics.selection();
    setIsInfoModalOpen(false);
  };
  const dismissVariantPhotoTip = () => {
    if (neverShowVariantPhotoTipAgain && vendorId) {
      try {
        localStorage.setItem(
          `${VARIANT_PHOTO_TIP_PREFIX}${vendorId}`,
          "hidden",
        );
        setVariantPhotoTipSuppressed(true);
      } catch (error) {
        console.warn("[AddProduct] Could not save the variant photo tip", error);
      }
    }
    setVariantPhotoTipDismissed(true);
    void appHaptics.selection();
  };
  // Remove size entry under the same color
  const removeSize = (colorIndex, sizeIndex) => {
    const updatedVariants = [...productVariants];
    updatedVariants[colorIndex].sizes = updatedVariants[
      colorIndex
    ].sizes.filter((_, i) => i !== sizeIndex);
    setProductVariants(updatedVariants);
  };

  // Add new color with size and stock inputs
  const addNewColor = () => {
    void appHaptics.selection();
    setProductVariants([
      ...productVariants,
      {
        color: "",
        sizes: [
          {
            size: isNoSizeProfile ? IMPLICIT_ONE_SIZE : "",
            stock: "",
            isActive: true,
          },
        ],
      },
    ]);
  };

  // Remove color block
  const removeColor = (colorIndex) => {
    setProductVariants(
      productVariants.filter((_, index) => index !== colorIndex)
    );
  };

  const reportValidationError = (field, message) => {
    setInvalidField(field);
    void appHaptics.warning();
    toast.dismiss();
    toast.error(message);

    window.requestAnimationFrame(() => {
      const fieldContainer = formScrollContainerRef.current?.querySelector(
        `[data-add-product-field="${field}"]`,
      );
      if (!fieldContainer) return;
      fieldContainer.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        const focusTarget =
          fieldContainer.matches?.("input, textarea, select, button")
            ? fieldContainer
            : fieldContainer.querySelector(
                "input:not([type='hidden']), textarea, select, button",
              );
        focusTarget?.focus?.({ preventScroll: true });
      }, 320);
    });
    return false;
  };

  const clearValidationError = (field) => {
    setInvalidField((current) => (current === field ? null : current));
  };

  const handleAddProduct = async () => {
    void appHaptics.medium();
    if (isPreparingImages) {
      toast.error("Please wait for your images to finish preparing.");
      return;
    }
    if (!currentUser || currentUser.uid !== vendorId) {
      toast.error("Unauthorized access or no user is signed in.");
      console.log("Unauthorized access or user not signed in."); // Debugging log
      return;
    }

    const variantsWithoutPristineTrailingRows =
      filterPristineTrailingSizeRows(productVariants);
    const variantsForSubmit = isNoSizeProfile
      ? materializeImplicitSizeVariants(variantsWithoutPristineTrailingRows)
      : variantsWithoutPristineTrailingRows;
    const subProductsForSubmit = isNoSizeProfile
      ? subProducts.map((subProduct) => ({
          ...subProduct,
          size: IMPLICIT_ONE_SIZE,
        }))
      : subProducts;

    if (productImages.length === 0) {
      return reportValidationError(
        "images",
        "Add at least one clear product image.",
      );
    }
    if (!productName.trim()) {
      return reportValidationError("name", "Enter a product name.");
    }
    if (itemClass === "fashion" && !category) {
      return reportValidationError("category", "Select a product category.");
    }
    if (!selectedProductType) {
      return reportValidationError("product-type", "Select a product type.");
    }
    if (!selectedSubType) {
      return reportValidationError("sub-type", "Select a product subtype.");
    }
    const numericPrice = Number(productPrice);
    if (!Number.isFinite(numericPrice) || numericPrice < 300) {
      return reportValidationError(
        "price",
        "Enter a product price of at least ₦300.",
      );
    }

    // Validate productVariants
    if (itemClass === "fashion" && variantsForSubmit.length === 0) {
      return reportValidationError(
        "variants",
        "Add at least one product option.",
      );
    }
    if (
      itemClass === "everyday" &&
      (!stockQuantity || Number(stockQuantity) <= 0)
    ) {
      return reportValidationError(
        "stock",
        "Enter a stock quantity greater than zero.",
      );
    }
    if (itemClass === "fashion") {
      // Validate each variant
      for (const [index, variant] of variantsForSubmit.entries()) {
        if (!variant.color) {
          return reportValidationError(
            `variant-color-${index}`,
            `Choose a colour for option ${index + 1}.`,
          );
        }
        if (variant.sizes.length === 0) {
          return reportValidationError(
            `variant-color-${index}`,
            `Add at least one size for option ${index + 1}.`,
          );
        }
        for (const [sizeIndex, sizeStock] of variant.sizes.entries()) {
          if (!sizeStock.size) {
            return reportValidationError(
              `variant-size-${index}-${sizeIndex}`,
              `Choose a size for option ${index + 1}.`,
            );
          }
          if (!sizeStock.stock || Number(sizeStock.stock) <= 0) {
            return reportValidationError(
              `variant-stock-${index}-${sizeIndex}`,
              `Enter stock greater than zero for option ${index + 1}.`,
            );
          }
        }
      }
    }

    // If variations are enabled, validate sub-products
    if (itemClass === "fashion" && hasVariations) {
      if (subProductsForSubmit.length === 0) {
        return reportValidationError(
          "variants",
          "Add at least one product variation.",
        );
      }

      // Validate each sub-product
      for (const [index, subProduct] of subProductsForSubmit.entries()) {
        if (
          subProduct.images.length === 0 ||
          !subProduct.size ||
          !subProduct.color ||
          !subProduct.stock
        ) {
          return reportValidationError(
            "variants",
            `Complete all fields for variation ${index + 1}.`,
          );
        }
      }
    }

    if (!productCondition) {
      return reportValidationError("condition", "Select the item condition.");
    }
    if (
      productCondition === "defect" &&
      !productDefectDescription.trim()
    ) {
      return reportValidationError(
        "defect",
        "Describe the defect so buyers know exactly what to expect.",
      );
    }
    if (!productDescription.trim()) {
      return reportValidationError(
        "description",
        "Add a useful product description.",
      );
    }
    if (
      !parcelRecommendation ||
      !isParcelSizeSelectionSafe(parcelSize, parcelRecommendation)
    ) {
      return reportValidationError(
        "parcel-size",
        "Choose a safe packed parcel size for this item.",
      );
    }

    // State updates alone do not close the tiny window between two rapid taps.
    // This synchronous lock guarantees one product ID and one commit per submit.
    if (publishLockRef.current) return;
    publishLockRef.current = true;
    setIsLoading(true);
    const totalImagesToUpload =
      productImages.length +
      subProductsForSubmit.reduce(
        (total, subProduct) => total + (subProduct.images?.length || 0),
        0,
      );
    setIsUploadingImage(true);
    setImageTask({
      phase: "uploading",
      current: totalImagesToUpload > 0 ? 1 : 0,
      total: totalImagesToUpload,
      percent: 0,
    });

    const vendorDocRef = doc(db, "vendors", vendorId);
    const newProductRef = doc(collection(db, "products"));
    let uploadedStorageRefs = [];
    let coreCommitted = false;

    try {
      let vendorData = vendorProfile;
      if (!vendorData?.shopName) {
        const vendorDoc = await getDoc(vendorDocRef);
        if (!vendorDoc.exists()) {
          throw new Error("Your store profile could not be found.");
        }
        vendorData = vendorDoc.data();
        setVendorProfile(vendorData);
      }

      const uploadEntries = [];
      productImages.forEach((image, index) => {
        const imageFile = image?.file || image;
        if (!(imageFile instanceof Blob) || !imageFile.name) {
          throw new Error(`Product image ${index + 1} is no longer available.`);
        }
        uploadEntries.push({
          key: `main:${index}`,
          file: imageFile,
          path: `${vendorId}/products/${newProductRef.id}/image-${index + 1}-${safeStorageFileName(imageFile.name)}`,
        });
      });

      subProductsForSubmit.forEach((subProduct, subProductIndex) => {
        (subProduct.images || []).forEach((image, imageIndex) => {
          const imageFile = image?.file || image;
          if (!(imageFile instanceof Blob) || !imageFile.name) {
            throw new Error(
              `Variation ${subProductIndex + 1}, image ${imageIndex + 1} is no longer available.`,
            );
          }
          uploadEntries.push({
            key: `sub:${subProductIndex}:${imageIndex}`,
            file: imageFile,
            path: `${vendorId}/products/${newProductRef.id}/subProducts/${subProduct.subProductId}/image-${imageIndex + 1}-${safeStorageFileName(imageFile.name)}`,
          });
        });
      });

      const uploadStartedAt = performance.now();
      const uploadedImages = await uploadProductImageBatch({
        storage,
        entries: uploadEntries,
        concurrency: 2,
        onProgress: ({ percent, completed }) => {
          setImageTask({
            phase: "uploading",
            current: Math.min(
              totalImagesToUpload,
              Math.max(1, completed + 1),
            ),
            total: totalImagesToUpload,
            percent,
          });
        },
      });
      uploadedStorageRefs = uploadedImages.map((image) => image.storageRef);
      console.info("[product-publish] image upload completed", {
        productId: newProductRef.id,
        imageCount: uploadedImages.length,
        durationMs: Math.round(performance.now() - uploadStartedAt),
      });

      const uploadedUrlByKey = new Map(
        uploadedImages.map((image) => [image.key, image.url]),
      );
      const imageUrls = productImages.map((_, index) =>
        uploadedUrlByKey.get(`main:${index}`),
      );
      if (imageUrls.some((url) => !url)) {
        throw new Error("One or more product images did not finish uploading.");
      }

      const isFashion = itemClass === "fashion";
      const coverImageUrl = imageUrls[0];

      // Prepare variants data
      let totalStockQuantity = 0;

      let variantsData = []; // fashion only
      let subProductsData = []; // fashion + hasVariations only

      if (isFashion) {
        /* ── VARIANTS ──────────────────────────────────────────── */
        variantsData = variantsForSubmit.flatMap((variant) => {
          const variantColor = variant.color.trim();
          return variant.sizes.map((sizeStock) => {
            const stock = Number(sizeStock.stock || 0);
            totalStockQuantity += stock;

            const sizeRef = createSizeRef(
              sizeStock.size,
              selectedProductType?.value,
              selectedSubType?.value,
              { source: "forward" },
            );
            return {
              color: variantColor,
              size: sizeStock.size,
              stock,
              ...(sizeRef ? { sizeRef } : {}),
            };
          });
        });

        /* ── SUB-PRODUCTS  (only when variations are enabled) ─── */
        if (hasVariations) {
          subProductsForSubmit.forEach((subProduct, subProductIndex) => {
            const subProductImageUrls = (subProduct.images || []).map(
              (_, imageIndex) =>
                uploadedUrlByKey.get(`sub:${subProductIndex}:${imageIndex}`),
            );
            if (subProductImageUrls.some((url) => !url)) {
              throw new Error(
                `Variation ${subProductIndex + 1} did not finish uploading.`,
              );
            }
            const stock = Number(subProduct.stock || 0);
            totalStockQuantity += stock;

            subProductsData.push({
              subProductId: subProduct.subProductId,
              color: subProduct.color.trim(),
              size: subProduct.size,
              stock,
              images: subProductImageUrls,
            });
          });
        }
      } else {
        // Everyday items: quantity comes from the simple input field
        totalStockQuantity = Number(stockQuantity);
      }
      setIsUploadingImage(false);
      setImageTask(null);

      const stockQty = isFashion ? totalStockQuantity : Number(stockQuantity);
      const discountDocRef = discountDetails
        ? doc(collection(db, "discounts"))
        : null;
      // Create the product object
      const product = {
        name: productName.trim(),
        description: productDescription.trim(),
        price: parseFloat(productPrice),
        coverImageUrl: coverImageUrl,
        imageUrls: imageUrls,
        isFeatured: false,
        vendorId: currentUser.uid,
        vendorName: vendorData.shopName,
        isFashion, // <-- boolean: true = fashion, false = everyday
        stockQuantity: stockQty,
        stockAlertBaseline: stockQty,
        condition: productCondition,
        // Lifestyle listings do not need a gender prompt, but retaining the
        // neutral value keeps the existing product/search schema compatible.
        category: isFashion ? category : "all",
        productType: selectedProductType.value,
        subType: selectedSubType.value,
        parcelProfile: {
          profileVersion: "listing-parcel-v1",
          tier: parcelSize,
          source: parcelSizeSource,
          recommendedTier: parcelRecommendation.key,
          confirmedAt: new Date(),
        },
        ...(isFashion &&
          selectedSizingProfile && {
            sizing: createListingSizingMetadata(selectedSizingProfile),
          }),
        createdAt: new Date(),
        tags: tags,
        ...(isFashion && { variants: variantsData }),
        ...(isFashion &&
          hasVariations &&
          subProductsData.length && {
            subProducts: subProductsData,
          }),
        published: true,
        isDeleted: false,
        editCount: 0,
        ...(discountDocRef && { discountId: discountDocRef.id }),
      };

      if (discountDetails) {
        product.discount = discountDetails;
      }
      if (productCondition === "defect" && productDefectDescription) {
        product.defectDescription = productDefectDescription.trim();
      }

      const vendorUpdates = {
        productIds: arrayUnion(newProductRef.id),
        ...(discountDocRef && { discountIds: arrayUnion(discountDocRef.id) }),
      };
      const firestoreBatch = writeBatch(db);
      firestoreBatch.set(newProductRef, product);
      firestoreBatch.update(vendorDocRef, vendorUpdates);

      if (discountDetails) {
        const discountData = {
          vendorId,
          type: discountDetails.discountType.startsWith("inApp")
            ? "inApp"
            : "personal",
          // For personal discounts, include discountSubType
          ...(discountDetails.discountType.startsWith("personal")
            ? {
                discountSubType:
                  discountDetails.discountType === "personal-monetary"
                    ? "monetary"
                    : "freebies",
              }
            : {}),
          isActive: true,
          createdAt: serverTimestamp(),
          // Only include pricing fields if this is NOT a freebies discount
          ...(discountDetails.discountType !== "personal-freebies" &&
          discountDetails.initialPrice
            ? {
                initialPrice: discountDetails.initialPrice,
                discountPrice: discountDetails.discountPrice,
                percentageCut: discountDetails.percentageCut,
                subtractiveValue: discountDetails.subtractiveValue,
              }
            : {}),
          // For personal freebies, include freebieText
          ...(discountDetails.discountType === "personal-freebies"
            ? { freebieText: discountDetails.freebieText }
            : {}),
          ...(discountDetails.selectedDiscount
            ? {
                selectedDiscountId: discountDetails.selectedDiscount.id,
                selectedDiscountName: discountDetails.selectedDiscount.name,
              }
            : {}),
        };
        firestoreBatch.set(discountDocRef, discountData);
      }

      const commitStartedAt = performance.now();
      await firestoreBatch.commit();
      coreCommitted = true;
      posthog?.capture("product_image_classification_finalized", {
        analysis_id: imageClassification.analysisId || null,
        image_suggestion_applied: Boolean(
          imageClassification.appliedSuggestion,
        ),
        suggestion_feedback: imageClassification.feedback || null,
        final_item_class: itemClass,
        final_category: isFashion ? category : "all",
        final_product_type: selectedProductType.value,
        final_sub_type: selectedSubType.value,
      });
      console.info("[product-publish] product committed", {
        productId: newProductRef.id,
        durationMs: Math.round(performance.now() - commitStartedAt),
      });

      // Activity is useful but non-critical; it must never hold up publishing.
      void logActivity(
        "Added New Product 📦",
        `You've added ${productName} to your store! You can now view and feature it in your store products section.`,
        "Product Update",
      );

      // Show success message and reset form
      rememberCurrentTags();
      void appHaptics.success();
      toast.success("Product added successfully");
      suppressDraftSaveRef.current = true;
      clearAddProductDraft(vendorId);
      void clearAddProductDraftImages(vendorId).catch((error) => {
        console.warn("[AddProductDraft] Draft images could not be cleared", {
          code: error?.name || "storage-unavailable",
        });
      });
      latestDraftRef.current = null;
      resetProductForm();
      setDraftRestored(false);
      closeModal({ force: true });
    } catch (error) {
      if (!coreCommitted) {
        const refsToDelete = uploadedStorageRefs.length
          ? uploadedStorageRefs
          : error?.storageRefs || [];
        if (refsToDelete.length) {
          await deleteProductImageRefs(refsToDelete);
        }
      }
      console.error("Error adding product: ", error);
      void appHaptics.error();
      toast.error("Error adding product: " + error.message);
    } finally {
      publishLockRef.current = false;
      setIsLoading(false);
      setIsUploadingImage(false);
      setImageTask(null);
    }
  };
  const handleImageUpload = async (event) => {
    const input = event.currentTarget;
    let files = Array.from(input.files || []);
    if (!files.length) return;

    // How many more we can take
    const remaining = Math.max(0, MAX_IMAGES - productImages.length);
    if (remaining <= 0) {
      toast.error(`You can only upload a maximum of ${MAX_IMAGES} images.`);
      input.value = "";
      return;
    }

    // Respect remaining capacity
    if (files.length > remaining) {
      toast(
        `Only ${remaining} more image${
          remaining > 1 ? "s" : ""
        } allowed. Extra file(s) ignored.`,
        { icon: "⚠️" }
      );
      files = files.slice(0, remaining);
    }

    // Reset the native input before expensive work so Android/iOS can dismiss
    // the picker immediately and the same files remain selectable later.
    input.value = "";
    const shouldAnalyzeCover = productImages.length === 0;
    const pendingImages = files.map((file) => ({
      ...createProductImagePreview(file),
      id: createLocalImageId(),
      status: "preparing",
    }));
    setProductImages((previous) =>
      [...previous, ...pendingImages].slice(0, MAX_IMAGES),
    );
    setIsPreparingImages(true);
    setImageTask({ phase: "optimizing", current: 1, total: files.length });
    await waitForPickerDismissal();

    let acceptedCount = 0;
    let analysisStarted = false;
    try {
      for (const [index, file] of files.entries()) {
        const pending = pendingImages[index];
        setImageTask({
          phase: "optimizing",
          current: index + 1,
          total: files.length,
        });

        try {
          const prepared = await prepareProductImage(file);
          const readyImage = {
            ...createProductImagePreview(prepared.file),
            id: pending.id,
            status: "ready",
            originalBytes: prepared.originalBytes,
            storedBytes: prepared.storedBytes,
            wasOptimized: prepared.wasOptimized,
          };
          URL.revokeObjectURL(pending.preview);
          setProductImages((current) =>
            current.map((image) =>
              image?.id === pending.id ? readyImage : image,
            ),
          );
          acceptedCount += 1;
          if (shouldAnalyzeCover && !analysisStarted) {
            analysisStarted = true;
            void analyzeFirstProductImage(prepared.file);
          }
        } catch (error) {
          URL.revokeObjectURL(pending.preview);
          setProductImages((current) =>
            current.filter((image) => image?.id !== pending.id),
          );
          console.error("Image preparation error:", error);
          toast.error(error.message || `${file.name} could not be prepared.`);
        }
      }

      if (acceptedCount) {
        setProductImages((current) => {
          const next = current.filter((image) => image?.status !== "preparing");
          if (
            restoredImageCountRef.current > 0 &&
            next.length >= restoredImageCountRef.current
          ) {
            setDraftRequiresImages(false);
            restoredImageCountRef.current = 0;
          }
          return next;
        });
        clearValidationError("images");
      }

      const added = acceptedCount;
      if (added > 0) {
        void appHaptics.success();
        toast.success(`${added} image${added > 1 ? "s" : ""} added`);
      } else {
        void appHaptics.warning();
        toast.error("No images were added.");
      }
    } finally {
      setIsPreparingImages(false);
      setImageTask(null);
    }
  };

  const activeList = itemClass === "fashion" ? productTypes : everydayType;
  const productTypeOptions = React.useMemo(
    () => buildProductTypePickerOptions(activeList, itemClass),
    [activeList, itemClass],
  );
  const handleClassificationChange = ({
    category: nextCategory,
    productTypeValue,
    subTypeValue,
    itemClass: requestedItemClass = itemClass,
    allowIncompleteSubType = false,
    source = "manual",
  }) => {
    const nextItemClass =
      requestedItemClass === "everyday" ? "everyday" : "fashion";
    const nextTypeOptions = buildProductTypePickerOptions(
      nextItemClass === "fashion" ? productTypes : everydayType,
      nextItemClass,
    );
    const nextType = nextTypeOptions.find(
      (option) => option.value === productTypeValue,
    );
    if (!nextType) return false;

    const nextSubTypeOptions = (nextType.subTypes || [])
      .map((subType) => {
        const value =
          typeof subType === "string"
            ? subType
            : String(subType?.name || subType?.value || "");
        return value ? { label: value, value } : null;
      })
      .filter(Boolean);
    const nextSubType = subTypeValue
      ? nextSubTypeOptions.find((option) => option.value === subTypeValue)
      : null;

    // A selector with subtype choices must never commit only its first two
    // stages. This guard prevents incomplete classifications at the boundary.
    if (
      nextSubTypeOptions.length &&
      !nextSubType &&
      !allowIncompleteSubType
    ) {
      return false;
    }

    let normalizedCategory =
      nextItemClass === "fashion" ? nextCategory || "" : "all";
    if (
      nextItemClass === "fashion" &&
      normalizedCategory &&
      !filterProductTypeOptionsForAudience(
        nextTypeOptions,
        normalizedCategory,
        nextItemClass,
      ).some((option) => option.value === nextType.value)
    ) {
      // Keep the useful type suggestion, but never infer an audience/type
      // combination that the existing catalogue selector would prohibit.
      normalizedCategory = "";
    }
    const itemClassChanged = nextItemClass !== itemClass;
    const taxonomyChanged =
      itemClassChanged ||
      nextType.value !== selectedProductType?.value ||
      (nextSubType?.value || "") !== (selectedSubType?.value || "");
    if (itemClassChanged) {
      if (
        hasVariantSizingDraft() &&
        !window.confirm(
          "Changing the item class requires you to reselect variant sizes and stock. Continue?",
        )
      ) {
        return false;
      }
      // Match the established manual item-class change behaviour so variants
      // from one catalogue can never leak into the other.
      resetSizesForNewTaxonomy();
    } else if (taxonomyChanged) {
      const origin = sizeTaxonomyOriginRef.current || {
        type: selectedProductType?.value,
        subType: selectedSubType?.value,
      };
      if (
        !confirmIncompatibleSizeReset({
          nextType: nextType.value,
          nextSubType: nextSubType?.value || "",
          fromType: origin.type,
          fromSubType: origin.subType,
        })
      ) {
        return false;
      }
    }

    sizeTaxonomyOriginRef.current = null;
    setItemClass(nextItemClass);
    if (nextItemClass === "everyday") setHasVariations(false);
    setCategory(normalizedCategory);
    setSelectedProductType(nextType);
    setSelectedSubType(nextSubType);
    clearValidationError("category");
    clearValidationError("product-type");
    clearValidationError("sub-type");
    if (source === "manual") {
      markClassificationManual(["productType", "subType"]);
    }
    return true;
  };

  const recordProductImageSuggestionFeedback = (feedback) => {
    setImageClassification((current) => ({ ...current, feedback }));
    posthog?.capture("product_image_classification_feedback", {
      analysis_id: imageClassification.analysisId || null,
      feedback,
      suggested_item_class:
        imageClassification.appliedSuggestion?.itemClass || null,
      suggested_product_type:
        imageClassification.appliedSuggestion?.productType || null,
      suggested_sub_type:
        imageClassification.appliedSuggestion?.subType || null,
      final_item_class: itemClass,
      final_product_type: selectedProductType?.value || null,
      final_sub_type: selectedSubType?.value || null,
    });
  };
  const contextualTagSuggestions = React.useMemo(() => {
    const productNameWords = productName
      .split(/[^a-zA-Z0-9]+/)
      .map(cleanTag)
      .filter(
        (word) =>
          word.length >= 3 && !TAG_STOP_WORDS.has(word.toLowerCase()),
      );
    const colourTags = productVariants
      .map((variant) => colorLabelMap.get(variant.color))
      .filter(Boolean);
    const candidates = [
      selectedProductType?.label,
      selectedSubType?.label,
      category && category !== "all" ? category : "",
      productCondition === "brand new"
        ? "Brand New"
        : productCondition === "thrift"
          ? "Thrifted"
          : productCondition,
      ...colourTags,
      ...productNameWords,
      discountDetails ? "On Sale" : "",
      "New Arrival",
      ...(imageClassification.tagSuggestions || []),
      ...learnedTags,
    ];
    const selected = new Set(tags.map((tag) => tag.toLowerCase()));
    const seen = new Set();

    return candidates
      .map(titleCaseTag)
      .filter((tag) => {
        const key = tag.toLowerCase();
        if (!tag || selected.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 14);
  }, [
    category,
    colorLabelMap,
    discountDetails,
    imageClassification.tagSuggestions,
    learnedTags,
    productCondition,
    productName,
    productVariants,
    selectedProductType?.label,
    selectedSubType?.label,
    tags,
  ]);
  const selectedSizeSystemLabel = getSizeSystemLabel(
    selectedProductType?.value,
    selectedSubType?.value,
  );
  const selectedSizingFieldLabel = selectedSizingProfile?.fieldLabel || "Size";

  // Handle size and stock changes
  const handleSizeStockChange = (colorIndex, sizeIndex, field, value) => {
    const updatedVariants = [...productVariants];
    const current = updatedVariants[colorIndex].sizes[sizeIndex];
    updatedVariants[colorIndex].sizes[sizeIndex] = { ...current, [field]: value };
    if (field === "size") {
      updatedVariants[colorIndex].sizes[sizeIndex].sizeRef = createSizeRef(
        value,
        selectedProductType?.value,
        selectedSubType?.value,
        { source: "forward" },
      );
    }
    setProductVariants(updatedVariants);
  };

  // Activate the next size input when clicked
  const activateNextSizeInput = (colorIndex, sizeIndex) => {
    const updatedVariants = [...productVariants];

    updatedVariants[colorIndex].sizes[sizeIndex].isActive = true;

    setProductVariants(updatedVariants);
  };
  // Handle closing of the sub-product modal
  const closeSubProductModal = (isCancelled = false) => {
    setShowSubProductModal(false);
    if (isCancelled) {
      setHasVariations(false);
    }
  };

  // Handle submitting the sub-products
  const handleSubProductSubmit = (receivedSubProducts) => {
    console.log("Sub-products received:", receivedSubProducts);
    setSubProducts(receivedSubProducts);
    setHasVariations(true);
    closeSubProductModal(); // Close the modal after submitting
  };

  const logActivity = async (title, note, type) => {
    const activityRef = collection(db, "vendors", vendorId, "activityNotes");
    const activityNote = {
      title,
      type,
      timestamp: new Date(),
      note: note,
    };

    try {
      await addDoc(activityRef, activityNote);
    } catch (error) {
      console.error("Error logging activity: ", error);
    }
  };

  const formatToCurrency = (value) => {
    // Ensure the input is always treated as cents and formatted accordingly
    let numericValue = value.replace(/\D/g, ""); // Remove non-digit characters
    let formattedValue = (numericValue / 100).toFixed(2); // Format as currency
    return formattedValue;
  };

  const handlePriceChange = (e) => {
    let inputValue = e.target.value;
    const formattedPrice = formatToCurrency(inputValue);
    setProductPrice(formattedPrice);
    clearValidationError("price");
  };

  const handleCategoryChange = (value) => {
    setCategory(value);
    clearValidationError("category");
  };

  const handleItemClassChange = (mode) => {
    if (mode === itemClass) return;
    if (
      hasVariantSizingDraft() &&
      !window.confirm(
        "Changing the item class requires you to reselect variant sizes and stock. Continue?",
      )
    ) {
      return;
    }
    resetSizesForNewTaxonomy();
    void appHaptics.selection();
    setItemClass(mode);
    if (mode === "everyday") {
      setHasVariations(false);
      setCategory("all");
    } else {
      setCategory("");
    }
    setSelectedProductType(null);
    setSelectedSubType(null);
    clearValidationError("product-type");
    clearValidationError("sub-type");
  };

  return (
    <div className="flex flex-col max-h-full  h-full bg-white">
      <div
        ref={formScrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-2 pb-10 space-y-6"
      >
        <ProductPublishProgress
          active={isPreparingImages || isUploadingImage}
          imageTask={imageTask}
        />
        <AddProductDraftNotice
          visible={draftRestored}
          requiresImages={draftRequiresImages}
          onDiscard={discardSavedDraft}
        />
        <ProductImagesSection
          images={productImages}
          currentIndex={currentImageIndex}
          carouselRef={scrollContainerRef}
          disabled={isPreparingImages || isUploadingImage}
          invalid={invalidField === "images"}
          maxImages={MAX_IMAGES}
          onScroll={handleScroll}
          onRemove={handleRemoveImage}
          onDotClick={handleDotClick}
          onUpload={handleImageUpload}
          onPick={() => {
            if (isPreparingImages || isUploadingImage) return;
            void appHaptics.selection();
            const inputId = productImages.length
              ? "imageUpload"
              : "coverFileInput";
            document.getElementById(inputId)?.click();
          }}
        />

        <ProductClassificationSuggestion
          suggestion={imageClassification.appliedSuggestion}
          feedback={imageClassification.feedback}
          onFeedback={recordProductImageSuggestionFeedback}
        />

        <ProductClassificationFields
          itemClass={itemClass}
          onItemClassChange={(mode) => {
            markClassificationManual([
              "itemClass",
              "category",
              "productType",
              "subType",
            ]);
            handleItemClassChange(mode);
          }}
          productName={productName}
          onProductNameChange={(value) => {
            setProductName(value);
            clearValidationError("name");
          }}
          category={category}
          onCategoryChange={(value) => {
            markClassificationManual(["category"]);
            handleCategoryChange(value);
          }}
          productTypeOptions={productTypeOptions}
          selectedProductType={selectedProductType}
          onProductTypeChange={(value) => {
            const selectedOption = productTypeOptions.find(
              (option) => option.value === value,
            );
            if (selectedOption?.value === selectedProductType?.value) {
              clearValidationError("product-type");
              return true;
            }
            const accepted = handleProductTypeChange(selectedOption || null);
            if (accepted) {
              markClassificationManual(["productType", "subType"]);
              clearValidationError("product-type");
            }
            return accepted;
          }}
          subTypeOptions={subTypeOptions}
          selectedSubType={selectedSubType}
          onSubTypeChange={(value) => {
            const selectedOption = subTypeOptions.find(
              (option) => option.value === value,
            );
            handleProductSubTypeChange(selectedOption || null);
            if (selectedOption) {
              markClassificationManual(["subType"]);
              clearValidationError("sub-type");
            }
          }}
          onClassificationChange={handleClassificationChange}
          invalidField={invalidField}
          analysisStatus={imageClassification.status}
          aiSuggestedFields={imageClassification.aiSuggestedFields}
        />
        {itemClass === "fashion" && (
          <div data-add-product-field="variants" className="mb-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-satoshi text-sm font-semibold text-gray-950">
                Product options
              </h3>
              <button
                type="button"
                onClick={openInfoModal}
                className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-gray-600 active:bg-gray-100"
                aria-label="How product options work"
              >
                <LuBadgeInfo className="h-4 w-4 text-customOrange" />
                How it works
              </button>
            </div>
            {isNoSizeProfile && (
              <p className="mb-3 text-xs font-satoshi text-gray-600">
                This category does not need a size. Add stock for each colour.
              </p>
            )}
            {showVariantPhotoWarning && (
              <aside
                className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 font-satoshi"
                aria-label="Product photo and option reminder"
              >
                <div className="flex items-start gap-2.5">
                  <LuBadgeInfo className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-amber-950">
                      Multiple photos, one option?
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-900/80">
                      We noticed you added 3 or more photos but only one colour
                      option. If these are different views of the same item,
                      you’re all set. If they show other colours or options,
                      add each one below so buyers see accurate availability.
                    </p>
                    <label className="mt-2.5 flex items-center gap-2 text-xs font-medium text-amber-950">
                      <input
                        type="checkbox"
                        checked={neverShowVariantPhotoTipAgain}
                        onChange={(event) => {
                          setNeverShowVariantPhotoTipAgain(event.target.checked);
                          void appHaptics.selection();
                        }}
                        className="h-4 w-4 accent-customOrange"
                      />
                      Don’t show this reminder again
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={dismissVariantPhotoTip}
                    aria-label="Dismiss product option reminder"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-amber-900 active:bg-amber-100"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>
              </aside>
            )}
            {productVariants.map((variant, colorIndex) => (
              <div
                key={colorIndex}
                data-add-product-field={`variant-color-${colorIndex}`}
                className="mb-4 relative"
              >
                <label className="block text-black mb-1 font-satoshi text-sm font-semibold">
                  Color
                </label>
<button
  type="button"
  onClick={() => openColorSheet(colorIndex)}
  aria-invalid={invalidField === `variant-color-${colorIndex}`}
  className={`w-full h-12 px-3 border-2 font-satoshi text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange flex items-center justify-between ${
    invalidField === `variant-color-${colorIndex}` ? "border-red-500" : ""
  }`}
>
  <div className="flex items-center gap-3">
    <div
      className="w-6 h-6 rounded-full border border-gray-200"
      style={{
        background:
          (variant.color && PALETTE?.[variant.color]?.css) || "#ffffff",
      }}
    />
    <span className="text-sm">
      {variant.color
        ? colorLabelMap.get(variant.color) || variant.color
        : "Choose a colour"}
    </span>
  </div>

  <span className="text-xs text-gray-500">Select</span>
</button>


                {/* Sizes and stock for this color */}
                {variant.sizes.map((sizeStock, sizeIndex) => {
                  // Get sizes already selected for this color, excluding the current one
                  const selectedSizes = variant.sizes
                    .filter((_, idx) => idx !== sizeIndex)
                    .map((sizeStock) => sizeStock.size);

                  // Filter sizeOptions to exclude sizes already selected under this color variant
                  const availableSizeOptions = sizeOptions.filter(
                    (option) => !selectedSizes.includes(option.value)
                  );

                  return (
                    <div key={sizeIndex} className="relative mt-2">
                      {/* Remove size button (only for additional sizes) */}
                      {!isNoSizeProfile && sizeIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => removeSize(colorIndex, sizeIndex)}
                          className="absolute top-0 right-0 text-customBrown"
                        >
                          <GoTrash />
                        </button>
                      )}
                      <div className="flex items-stretch space-x-4">
                        {!isNoSizeProfile && (
                        <div
                          data-add-product-field={`variant-size-${colorIndex}-${sizeIndex}`}
                          className="mt-2 flex min-w-0 flex-1 flex-col"
                        >
                          <label className="block text-black mb-1 font-satoshi text-sm font-semibold">
                            {selectedSizingFieldLabel}{selectedSizeSystemLabel ? ` (${selectedSizeSystemLabel})` : ""}
                          </label>
                          <NativePickerField
                            title={`${selectedSizingFieldLabel}${selectedSizeSystemLabel ? ` (${selectedSizeSystemLabel})` : ""}`}
                            options={availableSizeOptions}
                            value={sizeStock.size || ""}
                            onChange={(selectedValue) => {
                              activateNextSizeInput(colorIndex, sizeIndex);
                              handleSizeStockChange(
                                colorIndex,
                                sizeIndex,
                                "size",
                                selectedValue,
                              );
                              clearValidationError(
                                `variant-size-${colorIndex}-${sizeIndex}`,
                              );
                              if (
                                sizeIndex === variant.sizes.length - 1 &&
                                selectedValue !== ""
                              ) {
                                addSizeUnderColor(colorIndex);
                              }
                            }}
                            placeholder="Select Size"
                            className={`mt-auto h-12 rounded-lg border-2 px-3 font-satoshi text-sm focus:outline-none focus:ring-2 focus:ring-customOrange ${
                              invalidField ===
                              `variant-size-${colorIndex}-${sizeIndex}`
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                        </div>
                        )}
                        <div
                          data-add-product-field={`variant-stock-${colorIndex}-${sizeIndex}`}
                          className="mt-2 flex min-w-0 flex-1 flex-col"
                        >
                          <label className="block text-black mb-1 font-satoshi text-sm font-semibold">
                            Stock Quantity
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min={1}
                            value={sizeStock.stock}
                            onChange={(e) => {
                              const stockValue = e.target.value;
                              handleSizeStockChange(
                                colorIndex,
                                sizeIndex,
                                "stock",
                                stockValue
                              );
                              clearValidationError(
                                `variant-stock-${colorIndex}-${sizeIndex}`,
                              );
                            }}
                            onBlur={(e) => {
                              const stockValue = parseInt(e.target.value, 10);
                              if (stockValue <= 0) {
                                toast.error(
                                  "Stock quantity must be greater than 0."
                                );
                                handleSizeStockChange(
                                  colorIndex,
                                  sizeIndex,
                                  "stock",
                                  ""
                                );
                              }
                            }}
                            aria-invalid={
                              invalidField ===
                              `variant-stock-${colorIndex}-${sizeIndex}`
                            }
                            className={`mt-auto w-full h-12 p-3 border-2 font-satoshi text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange ${
                              !sizeStock.isActive
                                ? "bg-gray-200 cursor-pointer"
                                : ""
                            } ${
                              invalidField ===
                              `variant-stock-${colorIndex}-${sizeIndex}`
                                ? "border-red-500"
                                : ""
                            }`}
                            required
                            onFocus={() =>
                              activateNextSizeInput(colorIndex, sizeIndex)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Remove color block button (visible only for additional colors) */}
                {colorIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => removeColor(colorIndex)}
                    className="absolute top-2 -translate-y-2 right-2 text-customBrown"
                  >
                    <GoTrash />
                  </button>
                )}
              </div>
            ))}

            {/* Button to add another color with its size and stock */}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={addNewColor}
                className="text-customOrange font-satoshi text-sm flex items-center"
              >
                <FiPlus className="text-lg mr-1" />
                Add Another Option
              </button>
            </div>
          </div>
        )}
        <ProductPricingFields
          itemClass={itemClass}
          discountDetails={discountDetails}
          runDiscount={runDiscount}
          productPrice={productPrice}
          stockQuantity={stockQuantity}
          priceDisabled={isPriceDisabled}
          invalidField={invalidField}
          onRemoveDiscount={() => {
            void appHaptics.selection();
            setDiscountDetails(null);
            setRunDiscount(false);
            setIsPriceDisabled(false);
          }}
          onToggleDiscount={(value) => {
            setRunDiscount(value);
            if (value) {
              openDiscountModal();
              return;
            }
            setDiscountDetails(null);
            setIsDiscountModalOpen(false);
            setIsPriceDisabled(false);
          }}
          onClearDiscount={() => {
            setRunDiscount(false);
            setDiscountDetails(null);
            setIsDiscountModalOpen(false);
            setIsPriceDisabled(false);
            setProductPrice("");
          }}
          onPriceChange={handlePriceChange}
          onStockChange={(event) => {
            setStockQuantity(event.target.value);
            clearValidationError("stock");
          }}
        />

        <ProductDetailsFields
          condition={productCondition}
          defectDescription={productDefectDescription}
          description={productDescription}
          tags={tags}
          tagInput={tagInput}
          tagSuggestions={contextualTagSuggestions}
          invalidField={invalidField}
          onConditionChange={(event) => {
            setProductCondition(event.target.value);
            clearValidationError("condition");
          }}
          onDefectDescriptionChange={(event) => {
            setProductDefectDescription(event.target.value);
            clearValidationError("defect");
          }}
          onDescriptionChange={(event) => {
            if (event.target.value.length <= 700) {
              setProductDescription(event.target.value);
              clearValidationError("description");
            }
          }}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onTagInputChange={handleTagInputChange}
          onTagKeyDown={handleTagKeyDown}
        />

        <ProductParcelEstimateField
          itemClass={itemClass}
          productType={selectedProductType?.value}
          subType={selectedSubType?.value}
          value={parcelSize}
          source={parcelSizeSource}
          invalid={invalidField === "parcel-size"}
          onChange={(value) => {
            if (!isParcelSizeSelectionSafe(value, parcelRecommendation)) {
              void appHaptics.warning();
              toast.error("Choose a packed parcel size available for this item.");
              return;
            }
            setParcelSize(value);
            setParcelSizeSource("vendor-confirmed");
            clearValidationError("parcel-size");
          }}
        />


        {/* {itemClass === "fashion" && (
          <div className="mb-4">
            <VariationsToggle
              hasVariations={hasVariations}
              setHasVariations={(val) => {
                setHasVariations(val);
                if (val) {
                  setShowSubProductModal(true); // ON  → open modal
                } else {
                  setShowSubProductModal(false);
                  setSubProducts([]);
                }
              }}
              onInfo={openInfoModal}
              subProductsCount={subProducts.length}
              onClearVariations={() => {
                setSubProducts([]); // wipe data
                setHasVariations(false); // toggle OFF
              }}
              onAddMore={() => setShowSubProductModal(true)}
            />
          </div>
        )} */}
        {/* Discount Modal */}
        <DiscountModal
          isOpen={isDiscountModalOpen}
          onRequestClose={(cancel) => closeDiscountModal(cancel)}
          handleSaveDiscount={handleSaveDiscount}
        />

        {/* SubProduct Modal */}
        {showSubProductModal &&
          ReactDOM.createPortal(
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center modals">
              <div className="bg-white p-4 rounded-lg overflow-y-auto w-96 modals">
                <SubProduct
                  availableSizes={availableSizes}
                  addSubProduct={handleSubProductSubmit}
                  closeModal={(isCancelled) =>
                    closeSubProductModal(isCancelled)
                  }
                  initialSubProducts={subProducts}
                />
              </div>
            </div>,
            document.body
          )}

        {/* Debug console log for modal status */}
      </div>
<PaletteColorSheet
  open={colorSheetOpen}
  onClose={closeColorSheet}
  swatches={paletteSwatches}
  selectedKey={
    activeColorIndex !== null ? productVariants?.[activeColorIndex]?.color : ""
  }
  onSelect={selectVariantColor}
/>
      <AppBottomSheet
        open={isInfoModalOpen}
        onClose={closeInfoModal}
        height="46dvh"
        ariaLabel="How product options work"
        compactTop
        zIndex={5100}
        surfaceClassName="font-satoshi"
      >
        <div className="flex min-h-0 flex-1 flex-col pt-4">
          <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 pb-3">
            <div>
              <p className="text-xs font-medium text-customOrange">
                Listing guide
              </p>
              <h2 className="mt-0.5 text-[19px] font-semibold text-gray-950">
                Product options
              </h2>
            </div>
            <button
              type="button"
              onClick={closeInfoModal}
              aria-label="Close product options guide"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-900"
            >
              <FiX className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-5 pt-3 text-sm leading-6 text-gray-600">
            <div>
              <h3 className="font-semibold text-gray-950">One colour per option</h3>
              <p>
                Add another option when the same product is available in a
                different colour.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-950">Size controls stock</h3>
              <p>
                Each size has its own quantity, so customers can only choose an
                option that is actually available.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-950">Photos are one gallery</h3>
              <p>
                Use multiple photos for different views of this listing. If
                they show other colours, add those colour options too. Unrelated
                products should be separate listings.
              </p>
            </div>
          </div>
        </div>
      </AppBottomSheet>
      <button
        type="button"
        onClick={handleAddProduct}
        className={`add-product-publish-bar w-full h-12 font-satoshi text-lg rounded-full
          flex items-center justify-center focus:outline-none focus:ring
          ${
            isLoading || isPreparingImages || parseFloat(productPrice) < 300
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : discountDetails
              ? "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
              : "bg-customOrange text-white hover:bg-customOrange focus:ring-customOrange"
          }`}
        disabled={
          isLoading || isPreparingImages || parseFloat(productPrice) < 300
        }
      >
        {isLoading ? (
          <RotatingLines
            strokeColor="white"
            strokeWidth="5"
            animationDuration="0.75"
            width="24"
            visible
          />
        ) : (
          <>
            Publish Product
            {discountDetails && <FiGift className="ml-2 text-lg" />}
          </>
        )}
      </button>
    </div>
  );
};

export default AddProduct;
