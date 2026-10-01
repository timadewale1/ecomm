// EditProductModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import Modal from "react-modal";
import { auth, functions } from "../../firebase.config";
import { IoClose } from "react-icons/io5";
import { FreeMode } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/autoplay";
import SafeImg from "../../services/safeImg";
import PaletteColorSheet from "./add-product/PaletteColorSheet";
import EditProductFields from "./add-product/EditProductFields";
import { PALETTE, PALETTE_ORDER } from "../../services/pallete";
import { getSwatchFromRawColor } from "../../services/colorutils";
import { appHaptics } from "../../services/haptics";
import { buildProductTypePickerOptions } from "../../services/productTaxonomyPresentation";
import { safeStorageFileName } from "../../services/productImagePipeline";

// Existing app modules (kept)
import productTypes from "./producttype";
import productSizes from "./productsizes";
import everydayType from "./everydayType";
import ConfirmationDialog from "../../components/layout/ConfirmationDialog";
import { TbEdit } from "react-icons/tb";
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

const materializeImplicitSizeVariantsForEdit = (variants) =>
  (variants || []).map((variant) => {
    const sizes = variant.sizes || [];
    const hasLegacySize = sizes.some((entry) =>
      String(entry?.size || "").trim(),
    );
    if (hasLegacySize) {
      return {
        ...variant,
        sizes: sizes.map((entry) =>
          String(entry?.size || "").trim()
            ? entry
            : {
                ...entry,
                size: IMPLICIT_ONE_SIZE,
                sizeRef: null,
                sizeTouched: true,
              },
        ),
      };
    }
    return {
      ...variant,
      sizes: [
        {
          ...(sizes[0] || {}),
          size: IMPLICIT_ONE_SIZE,
          sizeRef: null,
          sizeTouched: true,
          isActive: true,
        },
      ],
    };
  });

Modal.setAppElement("#root");

const EditProductModal = ({ vendorId, selectedProduct, onClose }) => {
  // ---------- BASIC FIELDS ----------
  const [productName, setProductName] = useState(selectedProduct?.name || "");
  const [productDescription, setProductDescription] = useState(
    selectedProduct?.description || ""
  );
  const [productPrice, setProductPrice] = useState(
    typeof selectedProduct?.price === "number"
      ? selectedProduct.price.toFixed(2)
      : selectedProduct?.price?.toString() || ""
  );
  // Warning under price input
  const [priceWarn, setPriceWarn] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(
    selectedProduct?.stockQuantity?.toString() || ""
  );
  const [productDefectDescription, setProductDefectDescription] = useState(
    selectedProduct?.defectDescription || ""
  );
  const [category, setCategory] = useState(selectedProduct?.category || "");

  // ADD: canonical condition values used across the app (already in your file)
  const conditionOptions = [
    { label: "Brand New", value: "brand new" },
    { label: "Thrift", value: "thrift" },
    { label: "Defect", value: "defect" },
  ];

  // ADD: coerce any incoming 'condition' to the canonical string
  const normalizeCondition = (input) => {
    const raw =
      typeof input === "string" ? input : input?.value || input?.label || "";
    const s = String(raw).trim();
    if (!s) return "";
    // map by case-insensitive match
    const match =
      conditionOptions.find((o) => o.value.toLowerCase() === s.toLowerCase()) ||
     
      (s.toLowerCase().startsWith("defect") ? { value: "defect" } : null);
    return match ? match.value : s;
  };

  // ---------- TYPE / SUB-TYPE / CONDITION ----------
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedSubType, setSelectedSubType] = useState(null);
  const sizeTaxonomyOriginRef = useRef(null);
  const [productCondition, setProductCondition] = useState(
    normalizeCondition(selectedProduct?.condition || "")
  );

  // ---------- FASHION vs EVERYDAY ----------
  const [itemClass, setItemClass] = useState(
    selectedProduct?.isFashion != null
      ? selectedProduct.isFashion
        ? "fashion"
        : "everyday"
      : localStorage.getItem("matildaItemClass") || "fashion"
  );

  // ---------- VARIANTS / SUB‑PRODUCTS ----------
  const [productVariants, setProductVariants] = useState([
    { color: "", sizes: [{ size: "", stock: "", isActive: true }] },
  ]);
  const [hasVariations, setHasVariations] = useState(false);
  const [subProducts, setSubProducts] = useState(
    selectedProduct?.subProducts || []
  );
  const [sizeOptions, setSizeOptions] = useState([]); // ADD: size options based on type/subtype

  const isOriginalSizingTaxonomy =
    selectedProductType?.value === selectedProduct?.productType &&
    selectedSubType?.value === selectedProduct?.subType;
  const selectedSizingProfile = React.useMemo(
    () =>
      itemClass === "fashion"
        ? getListingSizingProfile(
            selectedProductType?.value,
            selectedSubType?.value,
            isOriginalSizingTaxonomy ? selectedProduct?.sizing : null,
          )
        : null,
    [
      itemClass,
      isOriginalSizingTaxonomy,
      selectedProduct?.sizing,
      selectedProductType?.value,
      selectedSubType?.value,
    ],
  );
  const isNoSizeProfile =
    selectedSizingProfile?.kind === LISTING_SIZE_KINDS.NONE;

  // ---------- IMAGES ----------
  const [productImages, setProductImages] = useState(
    Array.isArray(selectedProduct?.imageUrls) &&
      selectedProduct.imageUrls.length
      ? selectedProduct.imageUrls.map((url) => ({ preview: url }))
      : []
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Swiper instance (single source of truth for navigation) // ADD
  const swiperRef = useRef(null);

  // ---------- TAGS ----------
  const [tags, setTags] = useState(selectedProduct?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [colorSheetOpen, setColorSheetOpen] = useState(false);
  const [activeColorIndex, setActiveColorIndex] = useState(null);

  // ---------- APP STATE ----------
  const [isLoading, setIsLoading] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ---------- AUTH ----------
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUser(user);
      else toast.error("No user is signed in.");
    });
    return () => unsubscribe();
  }, []);

  // ---------- INIT FROM selectedProduct (run ONCE per product id) ----------
  // FIX: prevent overwriting local edits on each parent re-render
  const hydratedForIdRef = useRef(null); // ADD
  useEffect(() => {
    if (selectedProductType && selectedSubType) {
      const productTypeValue = selectedProductType.value.trim();
      const subTypeValue = selectedSubType.value.trim();
      const legacySizes = getLegacyCatalogSizes(
        productSizes,
        productTypeValue,
        subTypeValue,
      );
      const isOriginalTaxonomy =
        productTypeValue === selectedProduct?.productType &&
        subTypeValue === selectedProduct?.subType;
      const forwardOrLegacySizes = getListingSizeOptions({
        productType: productTypeValue,
        subType: subTypeValue,
        legacySizes,
        sizing: isOriginalTaxonomy ? selectedProduct?.sizing : null,
      });
      // Existing labels remain selectable while editing their original
      // taxonomy. They are not injected after a deliberate type change.
      const untouchedLegacySizes = isOriginalTaxonomy
        ? (selectedProduct?.variants || []).map((variant) => variant.size)
        : [];
      const subTypeSizes = Array.from(
        new Set([...untouchedLegacySizes, ...forwardOrLegacySizes].filter(Boolean)),
      );

      if (subTypeSizes && subTypeSizes.length > 0) {
        const options = subTypeSizes.map((size) => ({
          label: size,
          value: size,
        }));
        setSizeOptions(options);
      } else {
        setSizeOptions([]);
      }
    } else {
      setSizeOptions([]);
    }
  }, [selectedProduct?.id, selectedProductType, selectedSubType]);
  useEffect(() => {
    if (!isNoSizeProfile) return;
    setProductVariants((previous) =>
      materializeImplicitSizeVariantsForEdit(previous),
    );
  }, [isNoSizeProfile, selectedProductType?.value, selectedSubType?.value]);
  useEffect(() => {
    const pid = selectedProduct?.id;
    if (!pid) return;
    if (hydratedForIdRef.current === pid) return; // already hydrated for this product id

    hydratedForIdRef.current = pid;

    const isFashion = !!selectedProduct.isFashion;
    setItemClass(isFashion ? "fashion" : "everyday");

    const typeList = isFashion ? productTypes : everydayType;
    const typeObj = typeList.find(
      (i) => i.type === selectedProduct.productType
    );
    if (typeObj) {
      setSelectedProductType({
        label: typeObj.type,
        value: typeObj.type,
        subTypes: typeObj.subTypes,
      });
    }
    if (selectedProduct.subType) {
      setSelectedSubType({
        label: selectedProduct.subType,
        value: selectedProduct.subType,
      });
    }

    if (isFashion) {
      const variantsArray = [];
      (selectedProduct.variants || []).forEach((v) => {
        const exist = variantsArray.find((x) => x.color === v.color);
        const entry = {
          size: v.size,
          stock: String(v.stock ?? ""),
          isActive: true,
          sizeRef: v.sizeRef || null,
          sizeTouched: false,
        };
        if (exist) exist.sizes.push(entry);
        else variantsArray.push({ color: v.color, sizes: [entry] });
      });
      if (variantsArray.length) setProductVariants(variantsArray);

      if (
        Array.isArray(selectedProduct.subProducts) &&
        selectedProduct.subProducts.length
      ) {
        setHasVariations(true);
        setSubProducts(
          selectedProduct.subProducts.map((sp) => ({
            subProductId: sp.subProductId,
            color: sp.color,
            size: sp.size,
            stock: sp.stock,
            images: Array.isArray(sp.images) ? sp.images : [],
          }))
        );
      }
    }

    // Put cover first on load
    if (Array.isArray(selectedProduct.imageUrls)) {
      const urls = [...selectedProduct.imageUrls];
      const cover = selectedProduct.coverImageUrl;
      const idx = cover ? urls.indexOf(cover) : -1;
      if (idx > 0) {
        urls.splice(idx, 1);
        urls.unshift(cover);
      }
      setProductImages(urls.map((u) => ({ preview: u })));
      setCurrentImageIndex(0);
    }
  }, [selectedProduct?.id]); // FIX: depend only on id

  // ---------- HELPERS ----------
  const formatToCurrency = (value) => {
    const numeric = (value || "").replace(/\D/g, "");
    return ((Number(numeric) || 0) / 100).toFixed(2);
  };
  const handlePriceChange = (e) => {
    setProductPrice(formatToCurrency(e.target.value));
    parseFloat(formatToCurrency(e.target.value)) < 300 ? setPriceWarn(true) : setPriceWarn(false);
  };

  const storage = getStorage();

  // Keep Swiper in sync when the number of images changes (dots) // ADD
  useEffect(() => {
    if (swiperRef.current?.update) {
      swiperRef.current.update();
    }
  }, [productImages.length]);

  const getImgSrc = (image) =>
    image?.preview ? image.preview : typeof image === "string" ? image : "";

  const getImgKey = (image, idx) =>
    (image && image.preview) ||
    (typeof image === "string" ? image : `img-${idx}`); // ADD stable keys

  // ---------- IMAGE ACTIONS ----------
  const handleDotClick = (index) => {
    // Let Swiper drive the state via onSlideChange // FIX
    swiperRef.current?.slideTo(index);
  };

  // ---------- TYPE / SUBTYPE / CATEGORY ----------
  const activeProductTypes =
    itemClass === "fashion" ? productTypes : everydayType;
  const productTypeOptions = React.useMemo(
    () => buildProductTypePickerOptions(activeProductTypes, itemClass),
    [activeProductTypes, itemClass],
  );
  const subTypeOptions = React.useMemo(
    () =>
      (selectedProductType?.subTypes || [])
        .map((subType) => {
          const value =
            typeof subType === "string"
              ? subType
              : String(subType?.name || subType?.value || "");
          return value ? { label: value, value } : null;
        })
        .filter(Boolean),
    [selectedProductType],
  );
  const paletteSwatches = React.useMemo(
    () =>
      PALETTE_ORDER.map((key) => ({ key, ...PALETTE[key] })).filter(
        (entry) => entry?.key,
      ),
    [],
  );
  const colorLabelMap = React.useMemo(() => {
    const labels = new Map();
    PALETTE_ORDER.forEach((key) => {
      if (PALETTE?.[key]?.label) labels.set(key, PALETTE[key].label);
    });
    return labels;
  }, []);
  const selectedSizeSystemLabel = getSizeSystemLabel(
    selectedProductType?.value,
    selectedSubType?.value,
  );
  const selectedSizingFieldLabel = selectedSizingProfile?.fieldLabel || "Size";
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
        sizes: [{ size: "", stock: "", isActive: true, sizeTouched: true }],
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
    const currentProfile = getListingSizingProfile(
      fromType,
      fromSubType,
      fromType === selectedProduct?.productType &&
        fromSubType === selectedProduct?.subType
        ? selectedProduct?.sizing
        : null,
    );
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
        createSizeRef(entry.size, fromType, fromSubType, { source: "legacy" }),
    );
    const nextRefs = sizeEntries.map((entry) =>
      createSizeRef(entry.size, nextType, nextSubType, {
        source: entry.sizeRef ? "forward" : "legacy",
      }),
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
        // Preserve unparseable legacy labels across a known-compatible
        // taxonomy, or when the next specialist catalog explicitly lists the
        // same raw value. The raw label itself is never rewritten here.
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
      "This product type uses a different or ambiguous sizing system. Continue and reselect the sizes and stock for each colour?",
    );
    if (shouldReset) resetSizesForNewTaxonomy();
    return shouldReset;
  };

  const handleProductTypeChange = (opt) => {
    if (!opt) {
      setSelectedProductType(null);
      setSelectedSubType(null);
      return true;
    }
    if (opt.value === selectedProductType?.value) return true;
    const previousTaxonomy = sizeTaxonomyOriginRef.current || {
      type: selectedProductType?.value,
      subType: selectedSubType?.value,
    };
    const hasKnownTarget = Boolean(getListingSizingProfile(opt.value, ""));
    if (
      hasKnownTarget &&
      !confirmIncompatibleSizeReset({
        nextType: opt.value,
        nextSubType: "",
        fromType: previousTaxonomy.type,
        fromSubType: previousTaxonomy.subType,
      })
    ) {
      return false;
    }
    sizeTaxonomyOriginRef.current = hasKnownTarget ? null : previousTaxonomy;
    setSelectedProductType(opt);
    setSelectedSubType(null);
    return true;
  };
  const handleProductSubTypeChange = (opt) => {
    if (!opt) {
      setSelectedSubType(null);
      return true;
    }
    if (opt.value === selectedSubType?.value) return true;
    const origin = sizeTaxonomyOriginRef.current;
    if (
      !confirmIncompatibleSizeReset({
        nextType: selectedProductType?.value,
        nextSubType: opt.value,
        fromType: origin?.type || selectedProductType?.value,
        fromSubType: origin?.subType || selectedSubType?.value,
      })
    ) {
      return false;
    }
    sizeTaxonomyOriginRef.current = null;
    setSelectedSubType(opt);
    return true;
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
    setCategory(mode === "everyday" ? "all" : "");
    if (mode === "everyday") setHasVariations(false);
    setSelectedProductType(null);
    setSelectedSubType(null);
  };

  const handleClassificationChange = ({
    category: nextCategory,
    productTypeValue,
    subTypeValue,
  }) => {
    const nextType = productTypeOptions.find(
      (option) => option.value === productTypeValue,
    );
    if (!nextType) return false;
    const nextSubTypes = (nextType.subTypes || [])
      .map((subType) => {
        const value =
          typeof subType === "string"
            ? subType
            : String(subType?.name || subType?.value || "");
        return value ? { label: value, value } : null;
      })
      .filter(Boolean);
    const nextSubType = subTypeValue
      ? nextSubTypes.find((option) => option.value === subTypeValue)
      : null;
    if (nextSubTypes.length && !nextSubType) return false;

    const taxonomyChanged =
      nextType.value !== selectedProductType?.value ||
      (nextSubType?.value || "") !== (selectedSubType?.value || "");
    if (taxonomyChanged) {
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
    setCategory(itemClass === "fashion" ? nextCategory || "" : "all");
    setSelectedProductType(nextType);
    setSelectedSubType(nextSubType);
    return true;
  };

  // ---------- VARIANT INPUTS ----------
  const handleColorChange = (index, value) => {
    const next = [...productVariants];
    next[index].color = value;
    setProductVariants(next);
  };
  const openColorSheet = (index) => {
    void appHaptics.selection();
    setActiveColorIndex(index);
    setColorSheetOpen(true);
  };
  const closeColorSheet = () => {
    setColorSheetOpen(false);
    setActiveColorIndex(null);
  };
  const selectVariantColor = (paletteKey) => {
    if (activeColorIndex === null) return;
    handleColorChange(activeColorIndex, paletteKey);
    void appHaptics.selection();
    closeColorSheet();
  };
  const handleSizeStockChange = (colorIndex, sizeIndex, field, value) => {
    const next = [...productVariants];
    const current = next[colorIndex].sizes[sizeIndex];
    next[colorIndex].sizes[sizeIndex] = { ...current, [field]: value };
    if (field === "size") {
      next[colorIndex].sizes[sizeIndex].sizeTouched = true;
      next[colorIndex].sizes[sizeIndex].sizeRef = createSizeRef(
        value,
        selectedProductType?.value,
        selectedSubType?.value,
        { source: "forward" },
      );
    }
    setProductVariants(next);
  };
  const addNewColor = () =>
    setProductVariants((p) => [
      ...p,
      {
        color: "",
        sizes: [
          {
            size: isNoSizeProfile ? IMPLICIT_ONE_SIZE : "",
            stock: "",
            isActive: true,
            sizeTouched: isNoSizeProfile,
          },
        ],
      },
    ]);
  const removeColor = (idx) =>
    setProductVariants((p) => p.filter((_, i) => i !== idx));
  const addNewSize = (colorIndex) => {
    const next = [...productVariants];
    next[colorIndex].sizes.push({ size: "", stock: "", isActive: true });
    setProductVariants(next);
  };
  const removeSize = (colorIndex, sizeIndex) => {
    const next = [...productVariants];
    next[colorIndex].sizes.splice(sizeIndex, 1);
    setProductVariants(next);
  };

  // ---------- SAVE ----------
  const handleEdit = async () => {
    setIsLoading(true);
    if (!selectedProduct) {
      toast.error("No product selected.");
      setIsLoading(false);
      return;
    }

    const editSession = auth.currentUser;
    if (!editSession || editSession.isAnonymous || editSession.uid !== vendorId) {
      toast.error("Please sign in to your vendor account again.");
      setIsLoading(false);
      return;
    }

    const variantsWithoutPristineTrailingRows =
      filterPristineTrailingSizeRows(productVariants);
    const variantsForSubmit = isNoSizeProfile
      ? materializeImplicitSizeVariantsForEdit(
          variantsWithoutPristineTrailingRows,
        )
      : variantsWithoutPristineTrailingRows;
    const subProductsForSubmit = isNoSizeProfile
      ? subProducts.map((subProduct) => ({
          ...subProduct,
          size: String(subProduct.size || "").trim()
            ? subProduct.size
            : IMPLICIT_ONE_SIZE,
        }))
      : subProducts;

    if (
      !productName ||
      !productPrice ||
      productImages.length === 0 ||
      !productCondition ||
      !category ||
      !selectedProductType ||
      !selectedSubType ||
      !productDescription
    ) {
      toast.error("Please fill in all required fields.");
      setConfirmSave(false);
      setIsLoading(false);
      return;
    }
    if (productCondition === "defect" && !productDefectDescription) {
      toast.error("Please enter a defect description.");
      setConfirmSave(false);
      setIsLoading(false);
      return;
    }
    if (productPrice < 300) {
      toast.error("Product price must not be less than 300");
      setConfirmSave(false);
      setIsLoading(false);
      return;
    }
    if (itemClass === "everyday") {
      if (!stockQuantity || Number(stockQuantity) < 1) {
        toast.error("Please enter a stock quantity of at least 1.");
        setConfirmSave(false);
        setIsLoading(false);
        return;
      }
    } else {
      if (!variantsForSubmit.length) {
        toast.error("Please add at least one variant.");
        setConfirmSave(false);
        setIsLoading(false);
        return;
      }
      for (const [i, v] of variantsForSubmit.entries()) {
        if (!v.color) {
          toast.error(`Please enter a color for variant ${i + 1}.`);
          setConfirmSave(false);
          setIsLoading(false);
          return;
        }
        if (!v.sizes.length) {
          toast.error(`Please add at least one size for variant ${i + 1}.`);
          setConfirmSave(false);
          setIsLoading(false);
          return;
        }
        for (const [j, s] of v.sizes.entries()) {
          if (!s.size || !s.stock) {
            toast.error(
              `Enter size & stock for variant ${i + 1}, size ${j + 1}.`
            );
            setConfirmSave(false);
            setIsLoading(false);
            return;
          }
          if (s.stock < 1) {
            toast.error(
              `Enter a value more than zero for variant ${i + 1}, size ${
                j + 1
              }.`
            );
            setConfirmSave(false);
            setIsLoading(false);
            return;
          }
        }
      }
      if (hasVariations && !subProductsForSubmit.length) {
        toast.error(
          "Please add at least one sub-product or turn off variations."
        );
        setConfirmSave(false);
        setIsLoading(false);
        return;
      }
    }

    try {
      // Upload new images & keep existing URLs (first image becomes cover)
      const imageUrls = [];
      for (const img of productImages) {
        if (img?.file) {
          const storageRef = ref(
            storage,
            `${vendorId}/products/${selectedProduct.id}/${crypto.randomUUID()}-${safeStorageFileName(img.file.name)}`
          );
          await uploadBytes(storageRef, img.file, {contentType:img.file.type,customMetadata:{productId:selectedProduct.id}});
          imageUrls.push(await getDownloadURL(storageRef));
        } else if (img?.preview) {
          imageUrls.push(img.preview);
        } else if (typeof img === "string") {
          imageUrls.push(img);
        }
      }

      const isFashion = itemClass === "fashion";
      let totalStock = 0;
      let variantsData = [];
      let subProductsData = [];

      if (isFashion) {
        variantsData = variantsForSubmit.flatMap((variant) => {
          const c = (variant.color || "").trim();
          return variant.sizes.map((s) => {
            const stock = Number(s.stock || 0);
            totalStock += stock;
            const sizeRef = s.sizeTouched
              ? createSizeRef(
                  s.size,
                  selectedProductType?.value,
                  selectedSubType?.value,
                  { source: "forward" },
                )
              : s.sizeRef;
            return {
              color: c,
              size: s.size,
              stock,
              ...(sizeRef ? { sizeRef } : {}),
            };
          });
        });

        if (subProductsForSubmit && subProductsForSubmit.length > 0) {
          for (const sp of subProductsForSubmit) {
            const spImageUrls = [];
            for (const img of sp.images || []) {
              if (img?.name) {
                const refPath = `${vendorId}/products/${selectedProduct.id}/subProducts/${crypto.randomUUID()}-${safeStorageFileName(img.name)}`;
                const imgRef = ref(storage, refPath);
                await uploadBytes(imgRef, img, {contentType:img.type,customMetadata:{productId:selectedProduct.id}});
                spImageUrls.push(await getDownloadURL(imgRef));
              } else {
                spImageUrls.push(img);
              }
            }
            const stock = Number(sp.stock || 0);
            totalStock += stock;
            subProductsData.push({
              subProductId: sp.subProductId,
              color: sp.color.trim(),
              size: sp.size,
              stock,
              images: spImageUrls,
            });
          }
        }
      } else {
        totalStock = Number(stockQuantity || 0);
      }

      const updateData = {
        name: productName.trim(),
        description: productDescription.trim(),
        price: parseFloat(productPrice),
        coverImageUrl: imageUrls[0] || "", // first image is the cover
        imageUrls,
        isFashion,
        stockQuantity: isFashion ? totalStock : Number(stockQuantity || 0),
        stockAlertBaseline:
          Number(selectedProduct?.stockQuantity || 0) !==
          (isFashion ? totalStock : Number(stockQuantity || 0))
            ? isFashion
              ? totalStock
              : Number(stockQuantity || 0)
            : Number(
                selectedProduct?.stockAlertBaseline ??
                  selectedProduct?.stockQuantity ??
                  0,
              ),
        condition: productCondition,
        category,
        productType: selectedProductType?.value || "",
        subType: selectedSubType?.value || "",
        ...(isFashion && selectedSizingProfile
          ? { sizing: createListingSizingMetadata(selectedSizingProfile) }
          : selectedProduct?.sizing &&
              (!isFashion || !isOriginalSizingTaxonomy)
            ? { sizing: null }
            : {}),
        tags,
        variants: isFashion ? variantsData : [],
        subProducts: isFashion ? subProductsForSubmit : [],
      };

      if (productCondition === "defect" && productDefectDescription) {
        updateData.defectDescription = productDefectDescription.trim();
      }

      if (auth.currentUser !== editSession) return;
      await httpsCallable(functions, "updateVendorListingV1")({productId:selectedProduct.id, patch:updateData});
      if (auth.currentUser !== editSession) return;

      toast.success("Product updated successfully");
      onClose();
    } catch (err) {
      if (auth.currentUser !== editSession) return;
      console.error(err);
      toast.error("Error updating product: " + err.message);
      setConfirmSave(false);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- RENDER ----------
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return createPortal(
    <div
      className={`fixed z-[5600] font-satoshi inset-0 bg-black bg-opacity-40 flex items-end justify-center transition-all duration-300 ${
        visible ? "backdrop-blur-sm" : ""
      }`}
    >
      <div
        className={`relative flex h-[94dvh] max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[24px] shadow-md transform transition-all duration-[300ms] ease-in-out ${
          visible
            ? "translate-y-0 bg-white shadow-lg shadow-black/35 border border-white/10 backdrop-blur-md"
            : "translate-y-full bg-gradient-to-br from-white/5 to-white/5 via-white/10 shadow-lg shadow-black/35 border border-white/10"
        }`}
        style={{
          transitionProperty: "transform, background-color, background-image",
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5 pb-3 pt-4">
          <div>
            <h2 className="text-lg font-bold text-gray-950">Edit product</h2>
            <p className="mt-0.5 text-xs text-gray-500">Update the listing details buyers see.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="grid h-10 w-10 place-items-center rounded-full bg-gray-100 text-gray-900 disabled:opacity-50"
            aria-label="Close edit product"
          >
            <IoClose className="text-2xl" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4 overscroll-contain">

        {/* IMAGES */}
        <div>
          {productImages.length > 0 ? (
            <div className="relative w-full h-64 sm:h-80 rounded-lg overflow-hidden mb-4">
              <Swiper
                modules={[FreeMode]}
                slidesPerView={1}
                spaceBetween={5}
                allowTouchMove
                onSwiper={(s) => {
                  swiperRef.current = s;
                }} // ADD
                onSlideChange={(s) => setCurrentImageIndex(s.activeIndex)} // FIX
                className="product-images-swiper"
              >
                {productImages.map((image, index) => (
                  <SwiperSlide key={getImgKey(image, index)}>
                    {" "}
                    {/* FIX: stable keys */}
                    <div className="relative w-full h-full">
                      {index === 0 && (
                        <span className="absolute z-10 top-2 left-2 text-[10px] px-2 py-1 bg-black/60 text-white rounded">
                          Cover
                        </span>
                      )}
                      <SafeImg
                        src={getImgSrc(image) || ""}
                        alt={`${selectedProduct?.name || "product"} image ${
                          index + 1
                        }`}
                        className="object-cover w-full h-64"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* dots */}
              <div className="absolute bottom-4 z-10 w-full flex justify-center">
                {productImages.map((_, index) => (
                  <div
                    key={`dot-${index}`}
                    className={`cursor-pointer mx-1 rounded-full transition-all duration-300 ${
                      index === currentImageIndex
                        ? "bg-customOrange h-3 w-3"
                        : "bg-gray-300 h-2 w-2"
                    }`}
                    onClick={() => handleDotClick(index)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full h-64 flex items-center justify-center mb-4 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-400 font-satoshi">
                No images yet
              </span>
            </div>
          )}

          {/* minimal inline image controls */}
        </div>

        <EditProductFields
          itemClass={itemClass}
          onItemClassChange={handleItemClassChange}
          productName={productName}
          onProductNameChange={setProductName}
          category={category}
          onCategoryChange={setCategory}
          productTypeOptions={productTypeOptions}
          selectedProductType={selectedProductType}
          onProductTypeChange={(value) =>
            handleProductTypeChange(
              productTypeOptions.find((option) => option.value === value) ||
                null,
            )
          }
          subTypeOptions={subTypeOptions}
          selectedSubType={selectedSubType}
          onProductSubTypeChange={(value) =>
            handleProductSubTypeChange(
              subTypeOptions.find((option) => option.value === value) || null,
            )
          }
          onClassificationChange={handleClassificationChange}
          productVariants={productVariants}
          isNoSizeProfile={isNoSizeProfile}
          selectedSizingFieldLabel={selectedSizingFieldLabel}
          selectedSizeSystemLabel={selectedSizeSystemLabel}
          sizeOptions={sizeOptions}
          colorLabelMap={colorLabelMap}
          getColorCss={(color) =>
            PALETTE?.[color]?.css ||
            getSwatchFromRawColor(color)?.style?.background ||
            "#ffffff"
          }
          onOpenColorSheet={openColorSheet}
          onAddColor={addNewColor}
          onRemoveColor={removeColor}
          onSizeStockChange={handleSizeStockChange}
          onAddSize={addNewSize}
          onRemoveSize={removeSize}
          productPrice={productPrice}
          priceWarn={priceWarn}
          onPriceChange={handlePriceChange}
          stockQuantity={stockQuantity}
          onStockChange={(event) => setStockQuantity(event.target.value)}
          productCondition={productCondition}
          productDefectDescription={productDefectDescription}
          productDescription={productDescription}
          tags={tags}
          tagInput={tagInput}
          onConditionChange={(event) =>
            setProductCondition(event.target.value)
          }
          onDefectDescriptionChange={(event) =>
            setProductDefectDescription(event.target.value)
          }
          onDescriptionChange={(event) => {
            if (event.target.value.length <= 700) {
              setProductDescription(event.target.value);
            }
          }}
          onAddTag={(value) => {
            const nextTag = String(value || "").trim();
            if (nextTag && !tags.includes(nextTag)) {
              setTags((current) => [...current, nextTag]);
            }
            setTagInput("");
          }}
          onRemoveTag={(value) =>
            setTags((current) => current.filter((tag) => tag !== value))
          }
          onTagInputChange={(event) => setTagInput(event.target.value)}
          onTagKeyDown={(event) => {
            if (
              (event.key === "Enter" || event.key === ",") &&
              tagInput.trim()
            ) {
              event.preventDefault();
              const nextTag = tagInput.trim().replace(/,$/, "");
              if (nextTag && !tags.includes(nextTag)) {
                setTags((current) => [...current, nextTag]);
              }
              setTagInput("");
            } else if (
              event.key === "Backspace" &&
              !tagInput &&
              tags.length
            ) {
              setTags((current) => current.slice(0, -1));
            }
          }}
        />

        </div>

        {/* ACTIONS */}
        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-gray-100 bg-white px-5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-12 w-full rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 font-satoshi disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmSave(true);
            }}
            disabled={isLoading}
            className="h-12 w-full rounded-lg bg-customOrange text-sm font-semibold text-white font-satoshi shadow-sm disabled:opacity-60"
          >
            {isLoading ? "Saving…" : "Save changes"}
          </button>
        </div>

      </div>
      <PaletteColorSheet
        open={colorSheetOpen}
        onClose={closeColorSheet}
        swatches={paletteSwatches}
        selectedKey={
          activeColorIndex !== null
            ? productVariants?.[activeColorIndex]?.color
            : ""
        }
        onSelect={selectVariantColor}
      />
      <ConfirmationDialog
        isOpen={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={handleEdit}
        message="This will replace your product information with the information you have provided. Proceed?"
        icon={<TbEdit className="w-4 h-4" />}
        title="Save Edit Changes"
        loading={isLoading}
      />
    </div>,
    document.body,
  );
};

export default EditProductModal;
