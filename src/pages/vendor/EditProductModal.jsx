// EditProductModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import { FiPlus } from "react-icons/fi";
import toast from "react-hot-toast";
import Modal from "react-modal";
import { db } from "../../firebase.config";
import { IoClose } from "react-icons/io5";
import { FreeMode } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { motion } from "framer-motion";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/autoplay";
import SafeImg from "../../services/safeImg";

// Existing app modules (kept)
import productTypes from "./producttype";
import productSizes from "./productsizes";
import everydayType from "./everydayType";
import { AnimatePresence } from "framer-motion";
import ConfirmationDialog from "../../components/layout/ConfirmationDialog";
import { TbEdit } from "react-icons/tb";
import { handleUserActionLimit } from "../../services/userWriteHandler";

const animatedComponents = makeAnimated();
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_IMAGES = 4;

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

  const categoryOptions = [
    { label: "Men", value: "Mens" },
    { label: "Women", value: "Womens" },
    { label: "Kids", value: "Kids" },
    { label: "All", value: "all" },
  ];
  // ADD: canonical condition values used across the app (already in your file)
  const conditionOptions = [
    { label: "Brand New", value: "brand new" },
    { label: "Thrift", value: "thrift" },
    { label: "Defect:", value: "Defect:" },
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
      // handle variants like "Defect" / "defect:" => "Defect:"
      (s.toLowerCase().startsWith("defect") ? { value: "Defect:" } : null);
    return match ? match.value : s;
  };

  // ---------- TYPE / SUB-TYPE / CONDITION ----------
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedSubType, setSelectedSubType] = useState(null);
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
      // Access the sizes for the selected product type
      const trimmedProductType = selectedProductType.value.trim();
      const typeSizesObject = productSizes[trimmedProductType];

      let subTypeSizes = [];

      if (Array.isArray(typeSizesObject)) {
        subTypeSizes = typeSizesObject;
      } else if (
        typeof typeSizesObject === "object" &&
        typeSizesObject !== null
      ) {
        // Map `selectedSubType.value` to a key that matches productSizes format
        const formattedSubType = selectedSubType.value.replace(/\s+/g, ""); // Remove spaces
        subTypeSizes = typeSizesObject[formattedSubType] || [];
      }

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

  // ---------- SIZE OPTIONS ----------
  const [availableSizes, setAvailableSizes] = useState([]);
  useEffect(() => {
    if (!selectedProductType) {
      setAvailableSizes([]);
      return;
    }
    const typeKey = selectedProductType.value;
    const sizesDef = productSizes[typeKey];
    let sizes = [];
    if (Array.isArray(sizesDef)) {
      sizes = sizesDef;
    } else if (sizesDef && typeof sizesDef === "object") {
      if (selectedSubType?.value) {
        const sub =
          sizesDef[selectedSubType.value.replace(/\s+/g, "")] ||
          sizesDef[selectedSubType.value] ||
          [];
        if (Array.isArray(sub)) sizes = sub;
      } else {
        sizes = Object.values(sizesDef).flat();
      }
    }
    setAvailableSizes(sizes);
  }, [selectedProductType, selectedSubType]);

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

  const handleSetAsCover = () => {
    setProductImages((prev) => {
      if (!prev.length || currentImageIndex === 0) return prev;
      const next = [...prev];
      const [img] = next.splice(currentImageIndex, 1);
      next.unshift(img);
      return next;
    });
    setCurrentImageIndex(0);
    setTimeout(() => {
      swiperRef.current?.update?.();
      swiperRef.current?.slideTo?.(0);
    }, 0);
  };

  // ---------- TYPE / SUBTYPE / CATEGORY ----------
  const productTypeOptions = (
    itemClass === "fashion" ? productTypes : everydayType
  ).map((i) => ({
    label: i.type,
    value: i.type,
    subTypes: i.subTypes,
  }));
  const handleProductTypeChange = (opt) => {
    setSelectedProductType(opt);
    setSelectedSubType(null);
  };
  const handleProductSubTypeChange = (opt) => setSelectedSubType(opt);
  const handleCategorySelect = (opt) => setCategory(opt?.value || "");
  const handleConditionSelect = (opt) => setProductCondition(opt?.value || "");

  // ---------- VARIANT INPUTS ----------
  const handleColorChange = (index, value) => {
    const next = [...productVariants];
    next[index].color = value;
    setProductVariants(next);
  };
  const handleSizeStockChange = (colorIndex, sizeIndex, field, value) => {
    const next = [...productVariants];
    next[colorIndex].sizes[sizeIndex][field] = value;
    setProductVariants(next);
  };
  const addNewColor = () =>
    setProductVariants((p) => [
      ...p,
      { color: "", sizes: [{ size: "", stock: "", isActive: true }] },
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

    try {
      await handleUserActionLimit(
        currentUser.uid,
        "product_edit",
        {},
        {
          dayLimit: 1,
        }
      );
    } catch (limitError) {
      // If limit is reached, throw an error
      toast.error(limitError.message);
      setConfirmSave(false);
      setIsLoading(false);
      setIsLoading(false);
      return;
    }

    if (
      !productName ||
      !productPrice ||
      productImages.length === 0 ||
      !productCondition ||
      !category ||
      !selectedProductType ||
      !productDescription
    ) {
      toast.error("Please fill in all required fields.");
      setConfirmSave(false);
      setIsLoading(false);
      return;
    }
    if (productCondition === "Defect:" && !productDefectDescription) {
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
      if (!productVariants.length) {
        toast.error("Please add at least one variant.");
        setConfirmSave(false);
        setIsLoading(false);
        return;
      }
      for (const [i, v] of productVariants.entries()) {
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
      if (hasVariations && !subProducts.length) {
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
            `${vendorId}/products/${productName}/${img.file.name}`
          );
          await uploadBytes(storageRef, img.file);
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
        variantsData = productVariants.flatMap((variant) => {
          const c = (variant.color || "").trim();
          return variant.sizes.map((s) => {
            const stock = Number(s.stock || 0);
            totalStock += stock;
            return { color: c, size: s.size, stock };
          });
        });

        if (subProducts && subProducts.length > 0) {
          for (const sp of subProducts) {
            const spImageUrls = [];
            for (const img of sp.images || []) {
              if (img?.name) {
                const refPath = `${vendorId}/products/${productName}/subProducts/${sp.color}_${sp.size}/${img.name}`;
                const imgRef = ref(storage, refPath);
                await uploadBytes(imgRef, img);
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
        condition: productCondition,
        category,
        productType: selectedProductType?.value || "",
        subType: selectedSubType?.value || "",
        tags,
        updatedAt: serverTimestamp(),
        published: selectedProduct.published,
        isDeleted: selectedProduct.isDeleted,
        editCount: (selectedProduct.editCount || 0) + 1,
        variants: isFashion ? variantsData : [],
        subProducts: isFashion ? subProducts : [],
      };

      if (productCondition === "Defect:" && productDefectDescription) {
        updateData.defectDescription = productDefectDescription.trim();
      }

      const productDocRef = doc(db, "products", selectedProduct.id);
      await updateDoc(productDocRef, updateData);

      toast.success("Product updated successfully");
      onClose();
    } catch (err) {
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

  return (
    <div
      className={`fixed font-opensans inset-0 bg-black bg-opacity-40 flex justify-center modal1 transition-all duration-300 ${
        visible ? "backdrop-blur-sm" : ""
      }`}
    >
      <div
        className={`relative w-full p-6 rounded-t-2xl shadow-md transform transition-all duration-[300ms] ease-in-out overflow-y-auto ${
          visible
            ? "translate-y-0 bg-white shadow-lg shadow-black/35 border border-white/10 backdrop-blur-md"
            : "translate-y-full bg-gradient-to-br from-white/5 to-white/5 via-white/10 shadow-lg shadow-black/35 border border-white/10"
        }`}
        style={{
          transitionProperty: "transform, background-color, background-image",
        }}
      >
        <button onClick={onClose} className="sticky">
          <IoClose className="text-2xl" />
        </button>

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
              <span className="text-gray-400 text-sm font-opensans">
                No images yet
              </span>
            </div>
          )}

          {/* minimal inline image controls */}
        </div>

        <AnimatePresence>
          {productImages.length > 0 && currentImageIndex > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-start m-2"
            >
              <button
                type="button"
                onClick={handleSetAsCover}
                className="text-xs font-opensans font-semibold text-customOrange"
              >
                Set as cover Image
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FASHION vs EVERYDAY (unchanged layout) */}
        <div className="w-full max-w-md mx-auto flex justify-between items-center bg-gray-200 rounded-full p-1 mb-6">
          {["fashion", "everyday"].map((mode) => {
            const active = itemClass === mode;
            return (
              <button
                key={mode}
                onClick={() => {
                  setItemClass(mode);
                  if (mode === "everyday") setHasVariations(false);
                  setSelectedProductType(null);
                  setSelectedSubType(null);
                }}
                className={`w-1/2 py-2 rounded-full text-xs font-opensans font-semibold ${
                  active ? "bg-white text-customOrange" : "text-gray-800"
                }`}
              >
                {mode === "fashion" ? "Fashion / Wardrobe" : "Lifestyle Items"}
              </button>
            );
          })}
        </div>

        {/* NAME */}
        <div className="mb-4">
          <label className="font-opensans font-medium mb-1 text-sm text-black">
            Product Name
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full h-12 p-3 border-2 rounded-lg font-opensans focus:outline-none focus:border-customOrange"
            required
          />
        </div>

        {/* CATEGORY */}
        <div className="mb-4">
          <label className="font-opensans font-medium mb-1 text-sm text-black">
            Product Category
          </label>
          <Select
            options={categoryOptions}
            value={categoryOptions.find((o) => o.value === category) || null}
            onChange={handleCategorySelect}
            components={animatedComponents}
            className="w-full text-sm font-opensans"
            classNamePrefix="custom-select"
            placeholder="Select Category"
            isSearchable
            styles={{
              control: (provided) => ({
                ...provided,
                height: "3rem",
                borderColor: "#D1D5DB",
                borderRadius: "0.5rem",
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1rem",
                color: "black",
                paddingLeft: "0.75rem",
              }),
              input: (provided) => ({
                ...provided,
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1rem",
                color: "black",
              }),
              placeholder: (provided) => ({
                ...provided,
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1rem",
                color: "#6B7280",
              }),
            }}
          />
        </div>

        {/* PRODUCT TYPE */}
        <div className="mb-4">
          <label className="font-opensans font-medium mb-1 text-sm text-black">
            Product Type
          </label>
          <Select
            options={productTypeOptions}
            value={selectedProductType}
            onChange={handleProductTypeChange}
            components={animatedComponents}
            className="w-full text-sm font-opensans"
            classNamePrefix="custom-select"
            placeholder="Select Product Type"
            isSearchable
            styles={{
              control: (provided) => ({
                ...provided,
                height: "3rem",
                borderColor: "#D1D5DB",
                borderRadius: "0.5rem",
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1rem",
                color: "black",
                paddingLeft: "0.75rem",
              }),
              input: (provided) => ({
                ...provided,
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1rem",
                color: "black",
              }),
              placeholder: (provided) => ({
                ...provided,
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1rem",
                color: "#6B7280",
              }),
            }}
          />
        </div>

        {/* SUB-TYPE */}
        <AnimatePresence>
          {selectedProductType?.subTypes?.length ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <label className="font-opensans font-medium mb-1 text-sm text-black">
                Product Subtype
              </label>
              <Select
                options={selectedProductType.subTypes.map((st) =>
                  typeof st === "string"
                    ? { label: st, value: st }
                    : { label: st.name, value: st.name }
                )}
                value={selectedSubType}
                onChange={handleProductSubTypeChange}
                components={animatedComponents}
                className="w-full text-sm font-opensans"
                classNamePrefix="custom-select"
                placeholder="Select Subtype"
                isSearchable
                styles={{
                  control: (provided) => ({
                    ...provided,
                    height: "3rem",
                    borderColor: "#D1D5DB",
                    borderRadius: "0.5rem",
                    fontFamily: "Open Sans, sans-serif",
                    fontSize: "1rem",
                    color: "black",
                    paddingLeft: "0.75rem",
                  }),
                  input: (provided) => ({
                    ...provided,
                    fontFamily: "Open Sans, sans-serif",
                    fontSize: "1rem",
                    color: "black",
                  }),
                  placeholder: (provided) => ({
                    ...provided,
                    fontFamily: "Open Sans, sans-serif",
                    fontSize: "1rem",
                    color: "#6B7280",
                  }),
                }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* PRICE */}
        <div className="mb-4">
          <label className="font-opensans font-medium mb-1 text-sm text-black">
            Price (₦)
          </label>
          <input
            inputMode="numeric"
            placeholder="e.g. 5000 → type 500000 for ₦5,000.00"
            value={productPrice}
            onChange={handlePriceChange}
            className="w-full h-12 p-3 border-2 rounded-lg font-opensans focus:outline-none focus:border-customOrange"
          />
          <AnimatePresence>
            {priceWarn ? (
              <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="text-red-600 text-sm">
                Price must not be less than 300
              </motion.div>
            ) : ""}
          </AnimatePresence>
        </div>

        {/* CONDITION */}

        <div className="mb-4">
          <label className="font-opensans font-medium mb-1 text-sm text-black">
            Product Condition
          </label>
          <Select
            options={conditionOptions}
            value={
              conditionOptions.find((o) => o.value === productCondition) || null
            }
            onChange={handleConditionSelect}
            components={animatedComponents}
            className="w-full text-sm font-opensans"
            classNamePrefix="custom-select"
            placeholder="Select Condition"
            isSearchable
            styles={{
              control: (provided) => ({
                ...provided,
                height: "3rem",
                borderColor: "#D1D5DB",
                borderRadius: "0.5rem",
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1rem",
                color: "black",
                paddingLeft: "0.75rem",
              }),
              input: (provided) => ({
                ...provided,
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1rem",
                color: "black",
              }),
              placeholder: (provided) => ({
                ...provided,
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1rem",
                color: "#6B7280",
              }),
            }}
          />
        </div>

        <AnimatePresence>
          {productCondition === "Defect:" && (
            <div className="mb-4">
              <label className="font-opensans font-medium mb-1 text-sm text-black">
                Defect Description
              </label>
              <textarea
                value={productDefectDescription}
                onChange={(e) => setProductDefectDescription(e.target.value)}
                rows={3}
                className="w-full p-3 border rounded-lg font-opensans focus:outline-none focus:border-customOrange"
                placeholder="Describe the defect..."
              />
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {/* EVERYDAY: stock */}
          {itemClass === "everyday" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <label className="font-opensans font-medium mb-1 text-sm text-black">
                Stock Quantity
              </label>
              <input
                type="number"
                min={0}
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full h-12 p-3 border-2 rounded-lg font-opensans focus:outline-none focus:border-customOrange"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* FASHION: variants */}
        <AnimatePresence>
          {itemClass === "fashion" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-2">
                <label className="font-opensans font-medium text-sm text-black">
                  Variants
                </label>
                <button
                  type="button"
                  onClick={addNewColor}
                  className="text-xs font-opensans font-semibold text-customOrange"
                >
                  + Add Color
                </button>
              </div>

              {productVariants.map((variant, colorIndex) => (
                <div
                  key={colorIndex}
                  className="border border-gray-200 rounded-lg p-3 mb-3"
                >
                  <div className="flex relative items-center gap-2 mb-3">
                    {itemClass === "fashion" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, delay: 0.15 }}
                        className="flex-1"
                      >
                        <label className="block text-black mb-1 font-opensans text-sm">
                          Color
                        </label>
                        <input
                          type="text"
                          value={variant.color}
                          placeholder="One color per variant"
                          onChange={(e) =>
                            handleColorChange(colorIndex, e.target.value)
                          }
                          className="w-full h-10 p-2 border rounded-lg font-opensans focus:outline-none focus:border-customOrange"
                        />
                      </motion.div>
                    )}

                    {colorIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => removeColor(colorIndex)}
                        className="text-xl absolute top-0 right-0 font-opensans text-red-600 self-end"
                      >
                        <IoClose />
                      </button>
                    )}
                  </div>

                  {itemClass === "fashion" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, delay: 0.3 }}
                      className="space-y-2"
                    >
                      {variant.sizes.map((s, sizeIndex, arr) => {
                        const selectedSizes = variant.sizes
                          .filter((_, idx) => idx !== sizeIndex)
                          .map((sizeStock) => sizeStock.size);

                        // Filter sizeOptions to exclude sizes already selected under this color variant
                        const availableSizeOptions = sizeOptions.filter(
                          (option) => !selectedSizes.includes(option.value)
                        );
                        return (
                          <div
                            key={sizeIndex}
                            className="grid grid-cols-2 gap-2"
                          >
                            <div>
                              <label className="block text-black mb-1 font-opensans text-xs">
                                Size
                              </label>
                              <Select
                                options={availableSizeOptions} // Use filtered options
                                value={{
                                  label: s.size,
                                  value: s.size,
                                }}
                                onChange={(selectedOption) => {
                                  handleSizeStockChange(
                                    colorIndex,
                                    sizeIndex,
                                    "size",
                                    selectedOption.value
                                  );
                                  // if (
                                  //   sizeIndex === variant.sizes.length - 1 &&
                                  //   selectedOption.value !== ""
                                  // ) {
                                  //   // Add a new greyed-out input when user selects in the last one
                                  //   addSizeUnderColor(colorIndex);
                                  // }
                                }}
                                placeholder="Select Size"
                                isSearchable
                                className="w-full"
                                classNamePrefix="custom-select"
                                styles={{
                                  control: (provided) => ({
                                    ...provided,
                                    height: "3rem",
                                    borderColor: "#D1D5DB",
                                    borderRadius: "0.5rem",
                                    fontFamily: "Open Sans, sans-serif",
                                    fontSize: "1rem",
                                    color: "black",
                                    paddingLeft: "0.75rem",
                                  }),
                                  input: (provided) => ({
                                    ...provided,
                                    fontFamily: "Open Sans, sans-serif",
                                    fontSize: "1rem",
                                    color: "black",
                                  }),
                                  placeholder: (provided) => ({
                                    ...provided,
                                    fontFamily: "Open Sans, sans-serif",
                                    fontSize: "1rem",
                                    color: "#6B7280",
                                  }),
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-black mb-1 font-opensans text-xs">
                                Stock
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={s.stock}
                                onChange={(e) =>
                                  handleSizeStockChange(
                                    colorIndex,
                                    sizeIndex,
                                    "stock",
                                    e.target.value
                                  )
                                }
                                className="w-full h-12 p-2 border rounded-lg font-opensans focus:outline-none focus:border-customOrange"
                              />
                            </div>
                            {itemClass === "fashion" &&
                              sizeIndex === arr.length - 1 && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2, delay: 0.6 }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => addNewSize(colorIndex)}
                                    className="text-[13px] font-opensans font-semibold text-customOrange"
                                  >
                                    + Add Size
                                  </button>
                                </motion.div>
                              )}
                            {itemClass === "fashion" && arr.length > 1 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: 0.45 }}
                                className={`flex items-center justify-end font-semibold ${
                                  sizeIndex !== arr.length - 1
                                    ? "col-span-2"
                                    : ""
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeSize(colorIndex, sizeIndex)
                                  }
                                  className="text-[13px] font-opensans text-red-600"
                                >
                                  - Remove size
                                </button>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* DESCRIPTION */}
        <div className="mb-4">
          <label className="font-opensans font-medium mb-1 text-sm text-black">
            Description
          </label>
          <textarea
            rows={4}
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            className="w-full p-3 border rounded-lg font-opensans focus:outline-none focus:border-customOrange"
          />
        </div>

        {/* TAGS */}
        <div className="mb-6">
          <label className="font-opensans font-medium mb-1 text-sm text-black">
            Tags
          </label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                e.preventDefault();
                const t = tagInput.trim();
                if (!tags.includes(t)) setTags((prev) => [...prev, t]);
                setTagInput("");
              }
              if (e.key === "Backspace" && !tagInput && tags.length) {
                setTags((prev) => prev.slice(0, -1));
              }
            }}
            placeholder="Type a tag and press Enter"
            className="w-full h-12 p-3 border-2 rounded-lg font-opensans focus:outline-none focus:border-customOrange"
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((t, i) => (
                <span
                  key={`${t}-${i}`}
                  className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-opensans text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmSave(true);
            }}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-customOrange text-white font-opensans font-semibold text-sm shadow-sm disabled:opacity-60"
          >
            {isLoading ? "Saving…" : "Save changes"}
          </button>
        </div>

        {/* Sub-Product Modal (keep as you prefer) */}
        {/* <SubProduct
          isOpen={showSubProductModal}
          onClose={closeSubProductModal}
          onSubmit={handleSubProductSubmit}
          existingSubProducts={subProducts}
          availableSizes={availableSizes}
        /> */}
      </div>
      <ConfirmationDialog
        isOpen={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={handleEdit}
        message="This will replace your product information with the information you have provided. Proceed?"
        icon={<TbEdit className="w-4 h-4" />}
        title="Save Edit Changes"
        loading={isLoading}
      />
    </div>
  );
};

export default EditProductModal;
