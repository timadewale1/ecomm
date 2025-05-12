import React, { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  collection,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  where,
  query,
  getDocs,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import DiscountModal from "./DiscountModal";
import { IoIosGift } from "react-icons/io";
import ReactDOM from "react-dom";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../firebase.config";
import toast from "react-hot-toast";
import { Carousel } from "react-responsive-carousel";
import { FaImage, FaMinusCircle, FaSmileBeam } from "react-icons/fa";
import { RotatingLines } from "react-loader-spinner";
import axios from "axios";
import { AiOutlineProduct } from "react-icons/ai";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import { GiRegeneration } from "react-icons/gi";
import notifyFollowers from "../../services/notifyfollowers";
import { GoTrash } from "react-icons/go";
import { BiSolidImageAdd } from "react-icons/bi";
import { TiCameraOutline } from "react-icons/ti";
import { FiGift, FiPlus } from "react-icons/fi";
import SubProduct from "./SubProduct";
import productTypes from "./producttype";
import Modal from "react-modal";
import productSizes from "./productsizes";
import { LuBadgeInfo } from "react-icons/lu";
import { MdOutlineCancel, MdOutlineClose } from "react-icons/md";
const animatedComponents = makeAnimated();
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

const AddProduct = ({ vendorId, closeModal }) => {
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCoverImageFile, setProductCoverImageFile] = useState(null);
  const [productImageFiles, setProductImageFiles] = useState([]);
  const [stockQuantity, setStockQuantity] = useState("");
  const [productCondition, setProductCondition] = useState("");
  const [productDefectDescription, setProductDefectDescription] = useState("");
  const [category, setCategory] = useState("");
  const [productType, setProductType] = useState("");
  const [size, setSize] = useState([]);
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedSubType, setSelectedSubType] = useState(null);
  const [productVariants, setProductVariants] = useState([
    { color: "", sizes: [{ size: "", stock: "" }] },
  ]);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const [sizeOptions, setSizeOptions] = useState([]);
  const [color, setColor] = useState("");
  const [productImages, setProductImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const [vendorName, setVendorName] = useState("");
  const MAX_IMAGES = 4; // Max 4 images
  const [tags, setTags] = useState([]); // State to store tags
  const [tagInput, setTagInput] = useState(""); // State to manage tag input
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [hasVariations, setHasVariations] = useState(false);
  const [showSubProductModal, setShowSubProductModal] = useState(false);
  const [availableSizes, setAvailableSizes] = useState([]); // Ensure size dropdown syncs with this
  const [additionalImages, setAdditionalImages] = useState([]);
  const [subProducts, setSubProducts] = useState([]);
  const [runDiscount, setRunDiscount] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [isPriceDisabled, setIsPriceDisabled] = useState(false);
  const [initialPrice, setInitialPrice] = useState(""); // Replace with actual product price
  const [inAppDiscounts, setInAppDiscounts] = useState([]); // Stores fetched in-app discounts
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(true); // Tracks loading state for discoun
  const [currentUser, setCurrentUser] = useState(null);
  const [discountDetails, setDiscountDetails] = useState(null); // Store discount details
  const [isPriceEditable, setIsPriceEditable] = useState(true); // Control productPrice field's editability

  const storage = getStorage();
  Modal.setAppElement("#root");
  useEffect(() => {
    const fetchVendorName = async () => {
      if (currentUser) {
        const vendorDocRef = doc(db, "vendors", vendorId);
        const vendorDoc = await getDoc(vendorDocRef);

        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          setVendorName(vendorData.shopName || "Unknown Vendor");
        } else {
          setVendorName("Unknown Vendor");
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
  const closeDiscountModal = () => {
    setIsDiscountModalOpen(false);
  };

  const handleDiscountTypeChange = (e) => {
    setDiscountType(e.target.value);
  };
  const onDiscountSave = (details) => {
    setDiscountDetails(details);
    // Once a discount is saved, hide the discount option
    setRunDiscount(true);
  };

  // --- UI Helpers for Discount Summary ---
  // Returns a truncated version of freebie text (max 20 characters)
  const truncateText = (text, maxLength = 20) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const handleSaveDiscount = (details) => {
    setDiscountDetails(details);
    // For monetary discounts, update product price and disable input
    if (
      details.discountType.startsWith("inApp") ||
      details.discountType === "personal-monetary"
    ) {
      setProductPrice(details.discountPrice.toString());
      setIsPriceDisabled(true);
    }
    closeDiscountModal();
  };

  // Log the product type and sub-type change
  const handleProductTypeChange = (selectedOption) => {
    console.log("Product Type Changed to:", selectedOption);
    setSelectedProductType(selectedOption);
    setSelectedSubType(null); // Reset sub-type when product type changes
  };
  useEffect(() => {
    if (
      productName &&
      category &&
      selectedProductType &&
      selectedSubType &&
      productVariants.length &&
      productCondition
    ) {
      generateDescription();
    }
  }, [
    productName,
    category,
    selectedProductType,
    selectedSubType,
    productVariants,
    discountDetails, // reflect price cuts / freebies
    productCondition,
  ]);

  // Log the subTypeOptions array
  const subTypeOptions =
    selectedProductType?.subTypes.map((subType) =>
      typeof subType === "string"
        ? { label: subType, value: subType }
        : { label: subType.name, value: subType.name }
    ) || [];

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];

    files.forEach((file) => {
      if (file.size <= MAX_FILE_SIZE) {
        validFiles.push(file);
      } else {
        toast.error(`${file.name} exceeds the maximum file size of 3MB.`);
      }
    });

    if (validFiles.length + productImages.length > 4) {
      toast.error("You can only upload a maximum of 4 images.");
      return;
    }

    setProductImages((prevImages) => [...prevImages, ...validFiles]);
  };

  const handleRemoveImage = (index) => {
    const updatedImages = productImages.filter((_, i) => i !== index);
    setProductImages(updatedImages);

    if (index === currentImageIndex && updatedImages.length > 0) {
      setCurrentImageIndex(0);
    }
  };

  const handleDotClick = (index) => {
    setCurrentImageIndex(index);
    const scrollWidth = scrollContainerRef.current.offsetWidth;
    scrollContainerRef.current.scrollTo({
      left: scrollWidth * index,
      behavior: "smooth",
    });
  };
  useEffect(() => {
    const fetchInAppDiscounts = async () => {
      try {
        const discountsRef = collection(db, "inAppDiscounts");
        const q = query(discountsRef, where("isActive", "==", true)); // Fetch only active discounts
        const querySnapshot = await getDocs(q);

        const discounts = querySnapshot.docs.map((doc) => ({
          id: doc.id, // Include document ID
          ...doc.data(), // Spread document data
        }));

        setInAppDiscounts(discounts); // Update state with discounts
      } catch (error) {
        console.error("Error fetching in-app discounts:", error);
      } finally {
        setIsLoadingDiscounts(false); // Loading completed
      }
    };

    fetchInAppDiscounts();
  }, []);

  const handleScroll = () => {
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const scrollWidth = scrollContainerRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / scrollWidth);
    setCurrentImageIndex(newIndex);
  };

  const handleTagInputChange = (e) => {
    const value = e.target.value;
    if (value.includes(",")) {
      const newTag = value.replace(",", "").trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput(""); // Clear input after adding tag
    } else {
      setTagInput(value); // Update input if no comma detected
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      e.preventDefault(); // Prevent default backspace behavior
      setTags(tags.slice(0, -1)); // Remove the last tag
    }
  };
  const handleMultipleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (additionalImages.length + files.length > MAX_IMAGES - 1) {
      alert("You can upload a maximum of 4 images");
      return;
    }
    setAdditionalImages([...additionalImages, ...files]);
  };

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
    console.log("Opening variations info modal"); // Log when opening the modal
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    console.log("Closing variations info modal"); // Log when closing the modal
    setIsInfoModalOpen(false);
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
    setProductVariants([
      ...productVariants,
      { color: "", sizes: [{ size: "", stock: "", isActive: true }] },
    ]);
  };

  // Remove color block
  const removeColor = (colorIndex) => {
    setProductVariants(
      productVariants.filter((_, index) => index !== colorIndex)
    );
  };

  const handleAddProduct = async () => {
    if (!currentUser || currentUser.uid !== vendorId) {
      toast.error("Unauthorized access or no user is signed in.");
      console.log("Unauthorized access or user not signed in."); // Debugging log
      return;
    }

    // Validate required fields
    if (
      !productName ||
      !productPrice ||
      productImages.length === 0 ||
      !productCondition ||
      !category ||
      !selectedProductType ||
      // !selectedSubType ||
      !productDescription
    ) {
      toast.error("Please fill in all required fields!");
      console.log("Missing required fields!"); // Debugging log
      return;
    }

    // Validate productVariants
    if (productVariants.length === 0) {
      toast.error("Please add at least one product variant.");
      return;
    }
    if (productCondition === "Defect:" && !productDefectDescription) {
      toast.dismiss();
      toast.error(
        "Please provide a defect description for the defective product."
      );
      return;
    }

    // Validate each variant
    for (const [index, variant] of productVariants.entries()) {
      if (!variant.color) {
        toast.error(`Please enter a color for variant ${index + 1}.`);
        return;
      }
      if (variant.sizes.length === 0) {
        toast.error(`Please add at least one size for variant ${index + 1}.`);
        return;
      }
      for (const [sizeIndex, sizeStock] of variant.sizes.entries()) {
        if (!sizeStock.size || !sizeStock.stock) {
          toast.error(
            `Please enter size and stock for variant ${index + 1}, size ${
              sizeIndex + 1
            }.`
          );
          return;
        }
      }
    }

    // If variations are enabled, validate sub-products
    if (hasVariations) {
      if (subProducts.length === 0) {
        toast.error("Please add at least one sub-product.");
        return;
      }

      // Validate each sub-product
      for (const [index, subProduct] of subProducts.entries()) {
        if (
          subProduct.images.length === 0 ||
          !subProduct.size ||
          !subProduct.color ||
          !subProduct.stock
        ) {
          toast.error(
            `Please complete all fields for sub-product ${index + 1}.`
          );
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      // Upload main product images
      const imageUrls = [];
      for (const imageFile of productImages) {
        if (!imageFile || !imageFile.name) {
          console.error("Image file or filename is missing:", imageFile);
          toast.error("One of the images is missing a filename.");
          continue; // Skip this image
        }
        const storageRef = ref(
          storage,
          `${vendorId}/products/${productName}/${imageFile.name}`
        );
        await uploadBytes(storageRef, imageFile);
        const imageUrl = await getDownloadURL(storageRef);
        console.log("Uploaded Image URL:", imageUrl); // Log to confirm
        imageUrls.push(imageUrl);
      }

      // First image is the cover image
      const coverImageUrl = imageUrls[0];

      // Prepare variants data
      let totalStockQuantity = 0;
      const variantsData = [];

      for (const variant of productVariants) {
        const variantColor = variant.color.trim();
        for (const sizeStock of variant.sizes) {
          const stock = parseInt(sizeStock.stock, 10);
          totalStockQuantity += stock;

          const variantData = {
            color: variantColor,
            size: sizeStock.size,
            stock: stock,
          };

          variantsData.push(variantData);
        }
      }

      // Prepare sub-products data
      const subProductsData = [];

      for (const subProduct of subProducts) {
        // Upload sub-product images
        const subProductImageUrls = [];
        for (const imageFile of subProduct.images) {
          const storageRef = ref(
            storage,
            `${vendorId}/products/${productName}/subProducts/${subProduct.color}_${subProduct.size}/${imageFile.name}`
          );
          await uploadBytes(storageRef, imageFile);
          const imageUrl = await getDownloadURL(storageRef);
          subProductImageUrls.push(imageUrl);
        }
        const subProductStock = parseInt(subProduct.stock, 10);
        totalStockQuantity += subProductStock;
        const subProductData = {
          color: subProduct.color.trim(),
          size: subProduct.size,
          subProductId: subProduct.subProductId,
          stock: parseInt(subProduct.stock, 10),
          images: subProductImageUrls,
        };

        subProductsData.push(subProductData);
      }

      // Fetch vendor's data
      const vendorDocRef = doc(db, "vendors", vendorId);
      const vendorDoc = await getDoc(vendorDocRef);

      if (!vendorDoc.exists()) {
        toast.error("Vendor data not found.");
        console.log("Vendor data not found!");
        setIsLoading(false);
        return;
      }
      // if (subProducts.length > 0) {
      //   product.subProducts = subProductsData;
      // }
      const vendorData = vendorDoc.data();
      const vendorCoverImage = vendorData.coverImageUrl || "";

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
        stockQuantity: totalStockQuantity,
        condition: productCondition,
        category: category,
        productType: selectedProductType.value,
        subType: selectedSubType.value,
        createdAt: new Date(),
        tags: tags,
        variants: variantsData,
        published: true,
        isDeleted: false,
      };

      // Include subProducts if any
      if (subProductsData.length > 0) {
        product.subProducts = subProductsData;
      }
      if (discountDetails) {
        product.discount = discountDetails;
      }
      if (productCondition === "Defect:" && productDefectDescription) {
        product.defectDescription = productDefectDescription.trim();
      }

      // Add the product to the 'products' collection
      const productsCollectionRef = collection(db, "products");
      const newProductRef = doc(productsCollectionRef);
      await setDoc(newProductRef, product);

      // Add the product ID to the vendor's 'productIds' array
      await updateDoc(vendorDocRef, {
        productIds: arrayUnion(newProductRef.id),
      });
      if (discountDetails) {
        const discountsRef = collection(db, "discounts");
        const discountDocRef = doc(discountsRef);
        // Build the discount document data (ensure you save numbers as numbers)
        // Build the discount document data
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

        await setDoc(discountDocRef, discountData);
        // Update the vendor's discountIds field
        await updateDoc(vendorDocRef, {
          discountIds: arrayUnion(discountDocRef.id),
        });
        // Optionally, update the product document with a reference to the discount document
        await updateDoc(newProductRef, {
          discountId: discountDocRef.id,
        });
      }
      // Log activity and notify followers
      // Log activity when a discount is applied
      if (discountDetails) {
        await logActivity(
          "Running a Discount 🎉",
          `You've applied a ${
            discountDetails.discountType.startsWith("inApp")
              ? "store-wide"
              : "personal"
          } discount on ${productName}. Check your store for more details!`,
          "Discount Update"
        );
      } else {
        // Log activity when a product is added without a discount
        await logActivity(
          "Added New Product 📦",
          `You've added ${productName} to your store! You can now view and feature it in your store products section.`,
          "Product Update"
        );
      }

      await notifyFollowers(vendorId, {
        name: productName,
        shopName: vendorData.shopName,
        id: newProductRef.id,
        price: parseFloat(productPrice),
        vendorCoverImage: vendorCoverImage,
        coverImageUrl: coverImageUrl,
      });

      // Show success message and reset form
      toast.success("Product added successfully");
      // Reset form fields
      setProductName("");
      setProductDescription("");
      setProductPrice("");
      setProductImages([]);
      setProductCondition("");
      setProductDefectDescription("");
      setCategory("");
      setSelectedProductType(null);
      setSelectedSubType(null);
      setProductVariants([
        { color: "", sizes: [{ size: "", stock: "", isActive: true }] },
      ]);
      setTags([]);
      setHasVariations(false);
      setSubProducts([]);
      setDiscountDetails(null);
      setRunDiscount(false);
      closeModal();
    } catch (error) {
      console.error("Error adding product: ", error);
      toast.error("Error adding product: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files); // Convert to an array of File objects
    const validFiles = [];

    files.forEach((file) => {
      if (file.size <= MAX_FILE_SIZE) {
        validFiles.push(file); // Only add files that meet the size requirement
      } else {
        toast.error(`${file.name} exceeds the maximum file size of 3MB.`);
      }
    });

    // Check if adding these files exceeds the MAX_IMAGES limit
    if (validFiles.length + productImages.length > MAX_IMAGES) {
      toast.error("You can only upload a maximum of 4 images.");
      return;
    }

    // Add valid files to productImages (as File objects, not URLs)
    setProductImages((prevImages) => [...prevImages, ...validFiles]);
  };

  const productTypeOptions = productTypes.map((item) => ({
    label: item.type,
    value: item.type,
    subTypes: item.subTypes,
  }));

  const handleColorChange = (index, value) => {
    const updatedVariants = [...productVariants];
    updatedVariants[index].color = value;
    setProductVariants(updatedVariants);
  };

  // Handle size and stock changes
  const handleSizeStockChange = (colorIndex, sizeIndex, field, value) => {
    const updatedVariants = [...productVariants];
    updatedVariants[colorIndex].sizes[sizeIndex][field] = value;
    setProductVariants(updatedVariants);
  };

  // Activate the next size input when clicked
  const activateNextSizeInput = (colorIndex, sizeIndex) => {
    const updatedVariants = [...productVariants];

    updatedVariants[colorIndex].sizes[sizeIndex].isActive = true;

    setProductVariants(updatedVariants);
  };
  const handleVariationChange = (value) => {
    setHasVariations(value);
    if (!value) {
      setSubProducts([]);
    }
  };

  // Function to handle opening the SubProduct modal
  const openSubProductModal = () => {
    setShowSubProductModal(true);
  };

  // Handle closing of the sub-product modal
  const closeSubProductModal = () => {
    setShowSubProductModal(false);
  };

  // Handle submitting the sub-products
  const handleSubProductSubmit = (receivedSubProducts) => {
    console.log("Sub-products received:", receivedSubProducts);
    setSubProducts(receivedSubProducts);
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

  const generateDescription = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_AI;
    setIsGeneratingDescription(true);

    try {
      // collect colours and sizes from the variants UI
      const colours = productVariants
        .map((v) => v.color.trim())
        .filter(Boolean); // e.g. ["Black", "Wine"]

      const sizes = productVariants
        .flatMap((v) => v.sizes.map((s) => s.size))
        .filter(Boolean); // e.g. ["M", "L"]

      const payload = {
        name: productName.trim(),
        category,
        productType: selectedProductType?.value || "",
        subType: selectedSubType?.value || "",
        colours, // ← array, not stock counts
        sizes, // ← array, not stock counts
        condition: productCondition, // brand new / thrift / defect
        discount: discountDetails ?? null, // include only when set
      };

      const { data } = await axios.post(`${API_BASE_URL}/description`, payload);
      setProductDescription(data.description);
    } catch (err) {
      console.error("Error generating description:", err);
      toast.error("Couldn’t generate description 😕");
    } finally {
      setIsGeneratingDescription(false);
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
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
  };

  const highlightField = (field) => {
    return field ? "" : "border-red-500";
  };

  // Console log for tracking the product variations toggle

  return (
    <div className="relative">
      {isUploadingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <RotatingLines
            strokeColor="white"
            strokeWidth="5"
            animationDuration="0.75"
            width="96"
            visible={true}
          />
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2 font-opensans text-black flex items-center">
          <TiCameraOutline className="w-5 h-5 mr-2 text-xl font-medium text-black" />
          Upload Image
        </h3>

        <div className="flex flex-col items-center">
          <div
            ref={scrollContainerRef}
            className={`relative w-full h-80 flex overflow-x-scroll snap-x snap-mandatory space-x-4`}
            style={{ scrollBehavior: "smooth" }}
            onScroll={handleScroll}
          >
            {productImages.length > 0 ? (
              productImages.map((image, index) => (
                <div
                  key={index}
                  className={`relative flex-shrink-0 w-full h-full border-2 border-dashed border-customBrown border-opacity-30 rounded-md snap-center ${
                    index === currentImageIndex ? "opacity-100" : "opacity-65"
                  } transition-opacity duration-300`}
                >
                  <img
                    src={
                      image instanceof File ? URL.createObjectURL(image) : image
                    }
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover rounded-md"
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-customBrown text-white rounded-full p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(index);
                    }}
                  >
                    <GoTrash className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))
            ) : (
              <div
                className="w-full h-full border-opacity-30 border-2 border-dashed border-customBrown rounded-md flex items-center flex-col justify-center cursor-pointer"
                onClick={() =>
                  document.getElementById("coverFileInput").click()
                }
              >
                <BiSolidImageAdd className="h-16 w-16 text-customOrange opacity-20" />
                <h2 className="font-opensans px-10 text-center font-light text-xs text-customOrange opacity-90">
                  Upload product image here. Image must not be more than 3MB
                </h2>
              </div>
            )}

            <input
              id="coverFileInput"
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e)}
              className="hidden"
            />
          </div>
        </div>

        {/* Carousel Dots (only shown when there are multiple images) */}
        {productImages.length > 1 && (
          <div className="flex justify-center mt-2">
            {productImages.map((_, index) => (
              <div
                key={index}
                className={`cursor-pointer mx-0.5 rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? "bg-customOrange h-2.5 w-2.5"
                    : "bg-orange-300 h-2 w-2"
                }`}
                onClick={() => handleDotClick(index)}
              />
            ))}
          </div>
        )}

        {/* Add another image button */}
        <div className="flex justify-end mt-2">
          {productImages.length < 4 && (
            <button
              onClick={() => document.getElementById("imageUpload").click()}
              className="flex items-center font-semibold text-customOrange"
            >
              <FiPlus className="text-xl" />
              <span className="ml-1 font-opensans text-sm">
                Add Another Image
              </span>
            </button>
          )}
          <input
            id="imageUpload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="font-opensans font-medium mb-1 text-sm text-black">
          Product Name
        </label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="w-full h-12 p-3 border-2 font-opensans text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
          required
        />
      </div>
      <div className="mb-4">
        <label className="font-opensans font-medium mb-1 text-sm text-black">
          Product Category
        </label>
        <select
          value={category}
          onChange={handleCategoryChange}
          className="w-full h-12 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-black font-opensans text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange"
          style={{
            backgroundImage:
              "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 01 1.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0l-5.015-5.015a.75.75 0 01-1.06-1.06z%22 /></svg>')",
            backgroundPosition: "right 1rem center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "1rem",
          }}
          required
        >
          <option value="">Select Category</option>
          <option value="Mens">Men</option>
          <option value="Womens">Women</option>
          <option value="Kids">Kids</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="font-opensans font-medium mb-1 text-sm text-black ">
          Product Type
        </label>
        <Select
          options={productTypeOptions}
          value={selectedProductType}
          onChange={handleProductTypeChange}
          className="w-full font-opensans text-sm"
          classNamePrefix="custom-select"
          placeholder="Select Product Type"
          isSearchable
          styles={{
            control: (provided) => ({
              ...provided,
              height: "3rem", // h-12 equivalent
              borderColor: "#D1D5DB", // Equivalent to border-gray-300
              borderRadius: "0.5rem", // Equivalent to rounded-lg
              fontFamily: "Open Sans, sans-serif", // Equivalent to font-opensans
              fontSize: "1rem", // Equivalent to text-sm
              color: "black", // Equivalent to text-black
              paddingLeft: "0.75rem", // px-4
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
              color: "#6B7280", // Equivalent to text-gray-500
            }),
          }}
        />
      </div>

      {/* Sub Type Select */}
      {selectedProductType && (
        <div className="mb-4">
          <label className="font-opensans mb-1 text-sm text-black block">
            Sub Type
          </label>
          <Select
            options={selectedProductType?.subTypes.map(
              (subType) =>
                typeof subType === "string"
                  ? { label: subType, value: subType } // Handle string subType
                  : { label: subType.name, value: subType.name } // Handle object subType
            )}
            value={selectedSubType}
            onChange={setSelectedSubType}
            className="w-full font-opensans text-sm "
            classNamePrefix="custom-select"
            placeholder="Select Sub Type"
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
      )}
      <div className="mb-4">
        {productVariants.map((variant, colorIndex) => (
          <div key={colorIndex} className="mb-4 relative">
            <label className="block text-black mb-1 font-opensans text-sm">
              Color
            </label>

            <input
              type="text"
              value={variant.color}
              placeholder=" One color per variant"
              onChange={(e) => handleColorChange(colorIndex, e.target.value)}
              className="w-full h-12 p-3 border-2 font-opensans text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
              required
            />

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
                  {sizeIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => removeSize(colorIndex, sizeIndex)}
                      className="absolute top-0 right-0 text-customBrown"
                    >
                      <GoTrash />
                    </button>
                  )}
                  <div className="flex space-x-4">
                    <div className="flex-1 mt-2">
                      <label className="block text-black mb-1 font-opensans text-sm">
                        Size
                      </label>
                      <Select
                        options={availableSizeOptions} // Use filtered options
                        value={{ label: sizeStock.size, value: sizeStock.size }}
                        onChange={(selectedOption) => {
                          handleSizeStockChange(
                            colorIndex,
                            sizeIndex,
                            "size",
                            selectedOption.value
                          );
                          if (
                            sizeIndex === variant.sizes.length - 1 &&
                            selectedOption.value !== ""
                          ) {
                            // Add a new greyed-out input when user selects in the last one
                            addSizeUnderColor(colorIndex);
                          }
                        }}
                        onFocus={() =>
                          activateNextSizeInput(colorIndex, sizeIndex)
                        }
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
                    <div className="flex-1 mt-2">
                      <label className="block text-black mb-1 font-opensans text-sm">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        value={sizeStock.stock}
                        onChange={(e) => {
                          const stockValue = e.target.value;
                          handleSizeStockChange(
                            colorIndex,
                            sizeIndex,
                            "stock",
                            stockValue
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
                        className={`w-full h-12 p-3 border-2 font-opensans text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange ${
                          !sizeStock.isActive
                            ? "bg-gray-200 cursor-pointer"
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
            className="text-customOrange font-opensans text-sm flex items-center"
          >
            <FiPlus className="text-lg mr-1" />
            Add Another Option
          </button>
        </div>
      </div>
      {discountDetails ? (
        // If discount exists, show discount summary with delete icon
        <div className="flex items-center justify-between p-2 rounded-lg my-2 bg-gray-50 border border-customRichBrown">
          <div className="flex items-center">
            <span className="font-opensans text-sm text-customRichBrown font-semibold">
              {discountDetails.discountType.startsWith("inApp")
                ? "In‑App Discount"
                : "Personal Discount"}
            </span>
            <span
              className={`ml-20 font-opensans text-xs px-1 text-center py-1 rounded-md font-semibold ${
                discountDetails.discountType.startsWith("inApp") ||
                discountDetails.discountType === "personal-monetary"
                  ? "bg-green-600 text-white"
                  : "bg-customOrange text-white"
              }`}
            >
              {discountDetails.discountType.startsWith("inApp") ||
              discountDetails.discountType === "personal-monetary"
                ? `${discountDetails.percentageCut}% Off`
                : discountDetails.discountType === "personal-freebies"
                ? truncateText(discountDetails.freebieText)
                : ""}
            </span>
          </div>
          <button
            onClick={() => {
              setDiscountDetails(null);
              setRunDiscount(false);
            }}
            title="Remove Discount"
          >
            <GoTrash className="text-red-600 text-lg" />
          </button>
        </div>
      ) : (
        // Otherwise, show the discount option radio buttons
        <div className="mb-2">
          <div className="flex items-center">
            <label className="text-black font-opensans text-sm mb-1">
              Run a discount on this product?
            </label>
          </div>
          <div className="flex mt-2 items-center">
            <label className="inline-flex items-center mr-4">
              <input
                type="radio"
                value={false}
                checked={!runDiscount}
                onChange={() => setRunDiscount(false)}
                className="hidden"
              />
              <div
                className={`h-4 w-4 rounded-full border-2 border-customOrange flex items-center justify-center ${
                  !runDiscount ? "bg-customOrange" : "bg-white"
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    !runDiscount ? "bg-white" : "bg-transparent"
                  }`}
                ></div>
              </div>
              <span className="ml-2 font-opensans font-light text-xs text-black">
                No
              </span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value={true}
                checked={runDiscount}
                onChange={() => {
                  setRunDiscount(true);
                  openDiscountModal();
                }}
                className="hidden"
              />
              <div
                className={`h-4 w-4 rounded-full border-2 border-customOrange flex items-center justify-center ${
                  runDiscount ? "bg-customOrange" : "bg-white"
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    runDiscount ? "bg-white" : "bg-transparent"
                  }`}
                ></div>
              </div>
              <span className="ml-2 font-opensans font-light text-xs text-black">
                Yes
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="font-opensans font-medium mb-1 text-sm text-black">
          Product Price
        </label>
        <input
          type="text"
          value={productPrice}
          onChange={handlePriceChange}
          disabled={isPriceDisabled}
          className="w-full h-12 p-3 border-2 font-opensans text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
          required
        />
        {parseFloat(productPrice) < 300 && productPrice !== "" && (
          <p className="text-red-500 font-ubuntu text-xs mt-1">
            Minimum product price is 300 naira.
          </p>
        )}
      </div>

      <div className="mb-4">
        <label className="font-opensans mb-1 font-medium text-sm text-black">
          Product Condition
        </label>

        <select
          value={productCondition}
          onChange={(e) => setProductCondition(e.target.value)}
          className="w-full h-12 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-black font-opensans text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange"
          style={{
            backgroundImage:
              "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 01 1.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0l-5.015-5.015a.75.75 0 01-1.06-1.06z%22 /></svg>')",
            backgroundPosition: "right 1rem center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "1rem",
          }}
          required
        >
          <option value="">Select Condition</option>
          <option value="brand new">Brand New</option>
          <option value="thrift">Thrift</option>

          <option value="Defect:">Defect</option>
        </select>

        {productCondition === "Defect:" && (
          <div className="mt-4">
            <label className="block font-medium text-black text-sm font-opensans">
              Defect Description
            </label>
            <input
              type="text"
              value={productDefectDescription}
              onChange={(e) => setProductDefectDescription(e.target.value)}
              className="w-full h-10 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-black font-opensans text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange"
              required
            />
          </div>
        )}
      </div>

      <div className="mb-3">
        <label className="mb-1 text-black font-medium font-opensans text-sm">
          Product Description
        </label>
        <div
          className={`relative ${
            isGeneratingDescription ? "thinking-border" : ""
          }`}
        >
          <textarea
            value={productDescription}
            onChange={(e) => {
              if (e.target.value.length <= 700)
                setProductDescription(e.target.value);
            }}
            className="mt-1 block w-full px-4 py-2 border-2 text-sm rounded-lg focus:outline-none focus:border-customOrange font-opensans hover:border-customOrange h-24 resize-none"
          />

          {/* live counter */}
          <div className="absolute bottom-2 right-2 font-opensans text-gray-500 text-xs">
            {productDescription.length}/700
          </div>

          {/* thinking overlay */}
          {isGeneratingDescription && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg z-20">
              <p className="text-customOrange font-ubuntu text-sm animate-pulse text-center px-4">
                Matilda is thinking…
                <br />
                getting the right words for you…
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={generateDescription}
            className="px-2 py-2 bg-customOrange text-white rounded-md shadow-sm hover:bg-orange-700 focus:ring focus:ring-orange-600 focus:outline-none flex items-center"
            disabled={isGeneratingDescription}
          >
            {isGeneratingDescription ? (
              <RotatingLines
                strokeColor="white"
                strokeWidth="5"
                animationDuration="0.75"
                width="24"
                visible={true}
              />
            ) : (
              <GiRegeneration />
            )}
          </button>
        </div>
      </div>
      <div className="mb-4">
        <label className="font-opensans mb-1 text-sm font-medium text-black">
          Tags
        </label>

        {/* Suggestions Bar */}
        <div
          className="relative overflow-x-auto whitespace-nowrap mb-2 flex space-x-4 no-scrollbar"
          style={{
            maxWidth: "100%", // Ensures the container width limits the content for scrolling
          }}
        >
          {[
            "Discounts",
            "New Arrival",
            "Cargos",
            "Trending",
            "Limited Edition",
            "Jeans",
            "Tees",
            "Nike",
            "Adidas",
            "Sports",
          ].map((suggestion, index) => (
            <span
              key={index}
              onClick={() => setTags((prev) => [...prev, suggestion])} // Add tag on click
              className="bg-transparent animate-pulse border border-customOrange font-medium text-customBrown px-4 font-opensans py-1 text-xs rounded-full cursor-pointer hover:bg-orange-600 transition-all whitespace-nowrap"
            >
              {suggestion}
            </span>
          ))}
        </div>

        {/* Tag Input */}
        <div className="flex flex-wrap items-center border-2 border-gray-300 rounded-lg p-2">
          {tags.map((tag, index) => (
            <div
              key={index}
              className="bg-gray-100 text-xs text-black font-opensans rounded-lg px-2 py-1 mr-2 mb-2"
            >
              {tag}
            </div>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={handleTagInputChange}
            onKeyDown={handleTagKeyDown}
            placeholder="Type tag and press comma"
            className="flex-grow outline-none border-none font-opensans text-sm text-black"
          />
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center">
          <button>
            <LuBadgeInfo
              onClick={openInfoModal}
              className="w-5 h-5 mr-2 text-lg text-customBrown"
            />
          </button>

          <label className="text-black font-opensans text-sm mb-1">
            Does this product have variations?
          </label>
        </div>

        <div className="flex mt-2 items-center">
          {/* Option 1: No, it doesn't */}
          <label className="inline-flex items-center mr-4">
            <input
              type="radio"
              value={false}
              checked={!hasVariations}
              onChange={() => handleVariationChange(false)}
              className="hidden"
            />
            <div
              className={`h-4 w-4 rounded-full border-2 border-customOrange flex items-center justify-center ${
                !hasVariations ? "bg-customOrange" : "bg-white"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  !hasVariations ? "bg-white" : "bg-transparent"
                }`}
              ></div>
            </div>
            <span className="ml-2 font-opensans font-light text-xs text-black">
              No, it doesn't
            </span>
          </label>

          {/* Option 2: Yes, it does */}
          <label className="inline-flex items-center">
            <input
              type="radio"
              value={true}
              checked={hasVariations}
              onChange={() => handleVariationChange(true)}
              className="hidden"
            />
            <div
              className={`h-4 w-4 rounded-full border-2 border-customOrange flex items-center justify-center ${
                hasVariations ? "bg-customOrange" : "bg-white"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  hasVariations ? "bg-white" : "bg-transparent"
                }`}
              ></div>
            </div>
            <span className="ml-2 font-opensans font-light text-xs text-black">
              Yes, it does
            </span>
          </label>
        </div>

        {/* Add Sub-product button */}
        {hasVariations && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openSubProductModal}
              className="mt-3 px-4 py-2 bg-transparent font-opensans text-sm text-customOrange rounded-full border border-customBrown flex items-center"
            >
              <FiPlus className="mr-2" />
              Sub-product
              {subProducts.length > 0 && ` (${subProducts.length})`}
            </button>
          </div>
        )}
        <Modal
          isOpen={isInfoModalOpen}
          onRequestClose={closeInfoModal}
          className="modal-content "
          overlayClassName="modal-overlay modals"
        >
          <div className="flex items-center px-2 py-2 justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <FaSmileBeam className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                What are Product Variations?
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={closeInfoModal}
            />
          </div>
          <div className="px-4 -translate-y-6">
            <p className="text-gray-600 mt-2 font-opensans text-sm">
              Variations let you add different options like colors and sizes
              under one product listing, making it easy to manage similar
              products together. Ideal for products in the same category or
              type, so you don’t have to post each one separately.
            </p>
          </div>
        </Modal>
      </div>

      {/* Discount Modal */}
      <DiscountModal
        isOpen={isDiscountModalOpen}
        onRequestClose={closeDiscountModal}
        handleSaveDiscount={handleSaveDiscount}
      />

      <div className="text-sm">
        <button
          type="button"
          onClick={handleAddProduct}
          className={`w-full px-4 h-12 font-opensans text-lg rounded-full focus:ring focus:outline-none flex items-center justify-center ${
            isLoading || parseFloat(productPrice) < 300
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : discountDetails
              ? "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
              : "bg-customOrange text-white hover:bg-customOrange focus:ring-customOrange"
          }`}
          disabled={isLoading || parseFloat(productPrice) < 300}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <RotatingLines
                strokeColor="white"
                strokeWidth="5"
                animationDuration="0.75"
                width="24"
                visible={true}
              />
            </div>
          ) : (
            <>
              Publish Product
              {discountDetails && <FiGift className="ml-2 text-lg" />}
            </>
          )}
        </button>
      </div>

      {/* SubProduct Modal */}
      {showSubProductModal &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center modals">
            <div className="bg-white p-4 rounded-lg overflow-y-auto w-96 modals">
              <SubProduct
                availableSizes={availableSizes}
                addSubProduct={handleSubProductSubmit}
                closeModal={closeSubProductModal}
                initialSubProducts={subProducts}
              />
            </div>
          </div>,
          document.body
        )}

      {/* Debug console log for modal status */}
    </div>
  );
};

export default AddProduct;
