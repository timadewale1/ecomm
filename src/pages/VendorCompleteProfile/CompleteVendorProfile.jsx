import React, { useContext, useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { getAuth, signOut } from "firebase/auth";
import { deleteField, doc, setDoc } from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Form, Row } from "reactstrap";
import { GoChevronLeft } from "react-icons/go";
import { FiChevronRight, FiHelpCircle, FiLogOut, FiX } from "react-icons/fi";
import Loading from "../../components/Loading/Loading";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import SEO from "../../components/Helmet/SEO";
import { db } from "../../firebase.config";
import { appHaptics } from "../../services/haptics";
import { useTawk } from "../../components/Context/TawkProvider";
import { VendorContext } from "../../components/Context/Vendorcontext";
import { useAuth } from "../../custom-hooks/useAuth";
import banks from "../../services/banks";
import { validateVendorImage } from "../../services/imageUploadValidation";
import {
  completeVendorProfile,
  deleteVendorIdImage,
  getVendorOnboardingDraft,
  getVendorOnboardingErrorMessage,
  saveVendorOnboardingDraft,
} from "../../services/vendorOnboarding";
import VirtualVendor from "./virtualVendor";
import "./vendor.css";

const NativeFormPicker = registerPlugin("NativeFormPicker");

const EMPTY_SOCIALS = {
  instagram: "",
  twitter: "",
  tiktok: "",
  facebook: "",
};

const INITIAL_VENDOR_DATA = {
  shopName: "",
  categories: [],
  description: "",
  marketPlaceType: "virtual",
  coverImage: null,
  coverImageUrl: "",
  socialMediaHandle: EMPTY_SOCIALS,
  location: { lat: null, lng: null },
  Address: "",
  marketPlace: "",
  complexNumber: "",
  daysAvailability: [],
  openTime: "",
  closeTime: "",
  pickupAddress: "",
  pickupLat: null,
  pickupLng: null,
  idVerification: "",
  idUploaded: false,
  deliveryPreference: "self",
  needsDeliveryPreference: true,
  stockpile: null,
  state: "",
};

const EMPTY_BANK = {
  bankName: "",
  bankCode: "",
  accountNumber: "",
  accountName: "",
  error: "",
};

const hasSocialLink = (social = {}) => Object.values(social).some(Boolean);

const CompleteProfile = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(2);
  const [showDropdown, setShowDropdown] = useState(false);
  const [vendorData, setVendorData] = useState(INITIAL_VENDOR_DATA);
  const [bankDetails, setBankDetails] = useState(EMPTY_BANK);
  const [deliveryMode, setDeliveryMode] = useState("");
  const [idVerification, setIdVerification] = useState("");
  const [idImage, setIdImage] = useState(null);
  const [stockpileStep, setStockpileStep] = useState(1);
  const [stockpile, setStockpile] = useState(null);
  const [isIdImageUploading, setIsIdImageUploading] = useState(false);
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const hydratedRef = useRef(false);
  const completingRef = useRef(false);
  const idPreviewRef = useRef(null);
  const navigate = useNavigate();
  const { openChat, logoutChat } = useTawk();
  const { updateCurrentUserData } = useAuth();
  const { markVendorProfileComplete, refreshVendorData } =
    useContext(VendorContext);

  const categories = [
    "Thrifts", "Mens", "Womens", "Books", "Dairies", "Underwears",
    "Y2K", "Jewelry", "Kids", "Trads", "Dresses", "Gowns", "Shoes",
    "Accessories", "Bags", "Sportswear", "Formal", "Casual", "Vintage",
    "Brands", "Perfumes", "Watches", "Denim", "Hoodies", "Sweaters",
    "Scarves", "Sneakers", "Caps", "Athletic Wear", "Belts", "Earrings",
    "Bracelets", "Handcrafted Jewelry", "Coats", "Trench Coats",
    "Loungewear", "Leather Goods", "Sunglasses", "Necklaces",
    "Statement Pieces", "Oversized Clothing", "Graphic Tees",
    "Patchwork Denim", "Handbags", "Brogues", "Sandals", "Fragrances",
    "Essential Oils", "Luxury Jewelry", "Heels", "Crossbody Bags", "Rings",
  ];

  useEffect(() => {
    let cancelled = false;
    const restoreDraft = async () => {
      try {
        const { draft = {} } = await getVendorOnboardingDraft();
        if (cancelled) return;
        const restoredStockpile = draft.stockpile || null;
        const restoredBank = { ...EMPTY_BANK, ...(draft.bankDetails || {}) };
        setVendorData((current) => ({
          ...current,
          ...draft,
          socialMediaHandle: {
            ...EMPTY_SOCIALS,
            ...(draft.socialMediaHandle || {}),
          },
          location: { ...current.location, ...(draft.location || {}) },
          stockpile: restoredStockpile,
          idUploaded: draft.idUploaded === true,
        }));
        setStep(Math.min(6, Math.max(2, Number(draft.step) || 2)));
        setBankDetails(restoredBank);
        setSelectedBank(
          banks.find((bank) => bank.code === restoredBank.bankCode) || null
        );
        setDeliveryMode(draft.deliveryMode || "");
        setIdVerification(draft.idVerification || "");
        setStockpile(restoredStockpile);
        setDuration(restoredStockpile?.durationInWeeks || null);
        setStockpileStep(restoredStockpile?.enabled ? 2 : 1);
      } catch (error) {
        console.error("[VendorOnboarding] Draft restore failed", {
          code: error?.code || "unknown",
        });
        toast.error(
          getVendorOnboardingErrorMessage(
            error,
            "We couldn’t restore your saved setup. You can still continue."
          )
        );
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
          setLoading(false);
        }
      }
    };
    void restoreDraft();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current || completingRef.current) return undefined;
    const timeout = window.setTimeout(() => {
      const draft = {
        ...vendorData,
        step,
        bankDetails: {
          bankName: bankDetails.bankName,
          bankCode: bankDetails.bankCode,
          accountNumber: bankDetails.accountNumber,
          accountName: bankDetails.accountName,
        },
        deliveryMode,
        idVerification,
        idUploaded: vendorData.idUploaded === true,
        stockpile,
        coverImage: undefined,
      };
      saveVendorOnboardingDraft(draft).catch((error) => {
        console.error("[VendorOnboarding] Draft save failed", {
          code: error?.code || "unknown",
        });
      });
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [vendorData, bankDetails, deliveryMode, idVerification, stockpile, step]);

  useEffect(() => () => {
    if (idPreviewRef.current) URL.revokeObjectURL(idPreviewRef.current);
  }, []);

  const handleNextStep = () => {
    setStep((current) => current + 1);
    void appHaptics.selection();
  };

  const handleStockpileChoice = (enabled, weeks = null) => {
    if (!enabled) {
      const choice = { enabled: false, durationInWeeks: null };
      setStockpile(choice);
      setVendorData((current) => ({ ...current, stockpile: choice }));
      handleNextStep();
      return;
    }
    const choice = {
      enabled: true,
      durationInWeeks: weeks ?? stockpile?.durationInWeeks ?? null,
    };
    setStockpile(choice);
    setVendorData((current) => ({ ...current, stockpile: choice }));
    if (weeks == null) {
      setStockpileStep(2);
      void appHaptics.selection();
    }
  };

  const handlePreviousStep = () => {
    if (step === 5 && stockpileStep === 2) {
      setStockpileStep(1);
      void appHaptics.selection();
      return;
    }
    setStep((current) => Math.max(2, current - 1));
    void appHaptics.selection();
  };

  const handleInputChange = ({ target: { name, value } }) => {
    setVendorData((current) => ({ ...current, [name]: value }));
  };

  const handleSocialMediaChange = ({ target: { name, value } }) => {
    const formattedValue = value && !/^https?:\/\//i.test(value)
      ? `https://${value}`
      : value;
    setVendorData((current) => ({
      ...current,
      socialMediaHandle: {
        ...current.socialMediaHandle,
        [name]: formattedValue,
      },
    }));
  };

  const handleBankDetailsChange = ({ target: { name, value } }) => {
    setBankDetails((current) => ({ ...current, [name]: value }));
  };

  const handleDeliveryModeChange = (mode) => {
    setDeliveryMode(mode);
    setVendorData((current) => ({ ...current, deliveryMode: mode }));
    void appHaptics.selection();
  };

  const handleIdVerificationChange = (valueOrEvent) => {
    const value = typeof valueOrEvent === "string"
      ? valueOrEvent
      : valueOrEvent?.target?.value || "";
    setIdVerification(value);
    setVendorData((current) => ({ ...current, idVerification: value }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await validateVendorImage(file, { label: "shop cover image" });
      setIsCoverImageUploading(true);
      const user = getAuth().currentUser;
      if (!user) throw new Error("Sign in as a vendor to upload an image.");
      const storageRef = ref(getStorage(), `vendorImages/${user.uid}/coverImage`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const coverImageUrl = await getDownloadURL(storageRef);
      setVendorData((current) => ({ ...current, coverImageUrl }));
      await setDoc(doc(db, "vendors", user.uid), { coverImageUrl }, { merge: true });
      void appHaptics.success();
      toast.success("Shop image uploaded.");
    } catch (error) {
      toast.error(error?.message || "We couldn’t upload that image.");
    } finally {
      event.target.value = "";
      setIsCoverImageUploading(false);
    }
  };

  const handleRemoveCoverImage = async () => {
    const user = getAuth().currentUser;
    setVendorData((current) => ({ ...current, coverImageUrl: "" }));
    if (!user) return;
    try {
      await deleteObject(ref(getStorage(), `vendorImages/${user.uid}/coverImage`));
    } catch (error) {
      if (error?.code !== "storage/object-not-found") {
        console.error("[VendorOnboarding] Cover removal failed", {
          code: error?.code || "unknown",
        });
      }
    }
    await setDoc(
      doc(db, "vendors", user.uid),
      { coverImageUrl: deleteField() },
      { merge: true }
    );
  };

  const handleIdImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await validateVendorImage(file, { label: "ID image" });
      setIsIdImageUploading(true);
      const user = getAuth().currentUser;
      if (!user) throw new Error("Sign in as a vendor to upload your ID.");
      await uploadBytes(
        ref(getStorage(), `vendorImages/${user.uid}/idImage`),
        file,
        { contentType: file.type, cacheControl: "private,no-store,max-age=0" }
      );
      if (idPreviewRef.current) URL.revokeObjectURL(idPreviewRef.current);
      idPreviewRef.current = URL.createObjectURL(file);
      setIdImage(idPreviewRef.current);
      setVendorData((current) => ({
        ...current,
        idUploaded: true,
        idImage: undefined,
        idImageUrl: undefined,
      }));
      void appHaptics.success();
      toast.success("ID uploaded securely for review.");
    } catch (error) {
      toast.error(error?.message || "We couldn’t upload that ID image.");
    } finally {
      event.target.value = "";
      setIsIdImageUploading(false);
    }
  };

  const handleRemoveIdImage = async () => {
    try {
      await deleteVendorIdImage();
      if (idPreviewRef.current) URL.revokeObjectURL(idPreviewRef.current);
      idPreviewRef.current = null;
      setIdImage(null);
      setVendorData((current) => ({ ...current, idUploaded: false }));
      void appHaptics.selection();
    } catch (error) {
      toast.error(
        getVendorOnboardingErrorMessage(error, "We couldn’t remove that ID. Try again.")
      );
    }
  };

  const handleProfileCompletion = async (event) => {
    event?.preventDefault?.();
    if (completingRef.current) return;
    const missing = [];
    if (!vendorData.shopName) missing.push("shop name");
    if (!vendorData.Address ||
        !Number.isFinite(Number(vendorData.location?.lat)) ||
        !Number.isFinite(Number(vendorData.location?.lng))) {
      missing.push("delivery address");
    }
    if (!vendorData.state) missing.push("state");
    if (!vendorData.categories?.length) missing.push("category");
    if (!vendorData.description?.trim()) missing.push("description");
    if (!hasSocialLink(vendorData.socialMediaHandle)) missing.push("social link");
    if (!vendorData.coverImageUrl) missing.push("cover image");
    if (!bankDetails.accountName) missing.push("verified bank account");
    if (!deliveryMode) missing.push("delivery mode");
    if (!stockpile) missing.push("stockpile preference");
    if (!idVerification) missing.push("ID type");
    if (!vendorData.idUploaded) missing.push("ID image");
    if (missing.length) {
      toast.error(`Complete these details first: ${missing.join(", ")}.`);
      return;
    }

    completingRef.current = true;
    setIsLoading(true);
    try {
      const completion = await completeVendorProfile({
        ...vendorData,
        bankDetails,
        deliveryMode,
        idVerification,
        idUploaded: true,
        stockpile,
        step,
        idImage: undefined,
        idImageUrl: undefined,
      });
      if (completion?.success !== true) {
        throw new Error("Profile completion was not confirmed.");
      }

      // The callable only returns success after its Firestore batch commits.
      // Publish that committed state locally before mounting the dashboard so
      // a previous cached `profileComplete: false` cannot redirect backwards.
      markVendorProfileComplete({
        shopName: vendorData.shopName,
        coverImageUrl: vendorData.coverImageUrl,
      });
      updateCurrentUserData({ profileComplete: true, role: "vendor" });

      void refreshVendorData()
        .then((confirmedVendor) => {
          if (confirmedVendor?.profileComplete === true) {
            updateCurrentUserData({
              ...confirmedVendor,
              role: "vendor",
            });
          }
        })
        .catch((refreshError) => {
          // Completion is already committed. A follow-up read failure must not
          // send the vendor back to onboarding; the live listener reconciles.
          console.warn("[VendorOnboarding] Post-completion refresh deferred", {
            code: refreshError?.code || "unknown",
          });
        });

      void appHaptics.success();
      toast.success("Profile completed successfully!");
      navigate("/vendordashboard", {
        replace: true,
        state: { vendorProfileCompletion: "confirmed" },
      });
    } catch (error) {
      completingRef.current = false;
      console.error("[VendorOnboarding] Completion failed", {
        code: error?.code || "unknown",
      });
      toast.error(
        getVendorOnboardingErrorMessage(
          error,
          "We couldn’t complete your profile. Review your details and try again."
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openOnboardingSupport = () => {
    const vendorId = getAuth().currentUser?.uid;
    openChat({
      "support-entry": "vendor-onboarding",
      screen: "complete-vendor-profile",
      ...(vendorId ? { "vendor-id": vendorId } : {}),
    });
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setActionsOpen(false);
    try {
      void appHaptics.warning();
      try {
        await logoutChat();
      } catch (supportError) {
        // A support-widget failure must never prevent the vendor signing out.
        console.warn("[VendorOnboarding] Support logout cleanup failed", {
          code: supportError?.code || "unknown",
        });
      }
      await signOut(getAuth());
      toast.success("Successfully logged out.");
      navigate("/vendorlogin", { replace: true });
    } catch (error) {
      console.error("[VendorOnboarding] Logout failed", {
        code: error?.code || "unknown",
      });
      toast.error("We couldn’t log you out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const runOnboardingAction = (action) => {
    if (action === "support") {
      openOnboardingSupport();
      return;
    }
    if (action === "logout") void handleLogout();
  };

  const handleOpenActions = async () => {
    void appHaptics.selection();
    if (Capacitor.getPlatform() !== "ios") {
      setActionsOpen(true);
      return;
    }

    try {
      const result = await NativeFormPicker.present({
        title: "Vendor setup actions",
        labels: ["Need help? Contact support", "Log out"],
        values: ["support", "logout"],
        selectedValues: [],
        destructiveValues: ["logout"],
        multiple: false,
      });
      if (!result?.cancelled) {
        runOnboardingAction(result?.selectedValues?.[0]);
      }
    } catch (error) {
      console.warn("[VendorOnboarding] Native actions unavailable", {
        code: error?.code || "unknown",
      });
      setActionsOpen(true);
    }
  };

  return (
    <>
      <SEO
        title="Complete Your Profile - My Thrift"
        description="Complete your vendor profile on My Thrift"
        url="https://www.shopmythrift.store/complete-profile"
      />
      <section className="vendor-onboarding font-satoshi">
        <button
          type="button"
          className="ml-auto flex min-h-10 items-center rounded-md px-2 text-sm font-medium text-customOrange"
          onClick={handleOpenActions}
          aria-haspopup="dialog"
        >
          Actions
          <FiChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </button>
        <Row>
          {loading ? (
            <Loading />
          ) : (
            <Form className="font-satoshi" onSubmit={handleProfileCompletion}>
              {step > 2 && (
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="mt-4 rounded-md p-2 text-gray-800"
                  aria-label="Go to the previous setup step"
                >
                  <GoChevronLeft size={25} />
                </button>
              )}
              <VirtualVendor
                vendorData={vendorData}
                setVendorData={setVendorData}
                step={step}
                setStep={setStep}
                handleInputChange={handleInputChange}
                handleNextStep={handleNextStep}
                setShowDropdown={setShowDropdown}
                showDropdown={showDropdown}
                categories={categories}
                bankDetails={bankDetails}
                handleBankDetailsChange={handleBankDetailsChange}
                deliveryMode={deliveryMode}
                handleDeliveryModeChange={handleDeliveryModeChange}
                stockpile={stockpile}
                stockpileStep={stockpileStep}
                setStockpileStep={setStockpileStep}
                handleStockpileChoice={handleStockpileChoice}
                duration={duration}
                setDuration={setDuration}
                idVerification={idVerification}
                handleIdVerificationChange={handleIdVerificationChange}
                idImage={idImage}
                setIdImage={setIdImage}
                isIdImageUploading={isIdImageUploading}
                isCoverImageUploading={isCoverImageUploading}
                handleIdImageUpload={handleIdImageUpload}
                handleRemoveIdImage={handleRemoveIdImage}
                handleImageUpload={handleImageUpload}
                handleRemoveCoverImage={handleRemoveCoverImage}
                handleSocialMediaChange={handleSocialMediaChange}
                isLoading={isLoading}
                handleProfileCompletion={handleProfileCompletion}
                setBankDetails={setBankDetails}
                showBankDropdown={showBankDropdown}
                setShowBankDropdown={setShowBankDropdown}
                selectedBank={selectedBank}
                setSelectedBank={setSelectedBank}
              />
            </Form>
          )}
        </Row>
      </section>

      <AppBottomSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        height="36dvh"
        ariaLabel="Vendor setup actions"
        compactTop
        zIndex={5200}
      >
        <div className="flex min-h-0 flex-1 flex-col pt-5 font-satoshi">
          <header className="flex items-center justify-between border-b border-gray-100 px-4 pb-3">
            <span className="h-9 w-9" aria-hidden="true" />
            <h2 className="text-base font-semibold text-gray-950">Actions</h2>
            <button
              type="button"
              onClick={() => setActionsOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-800"
              aria-label="Close actions"
            >
              <FiX className="h-5 w-5" />
            </button>
          </header>

          <div className="px-4 py-2">
            <button
              type="button"
              onClick={() => {
                setActionsOpen(false);
                openOnboardingSupport();
              }}
              className="flex min-h-14 w-full items-center border-b border-gray-100 py-3 text-left text-[15px] text-gray-900"
            >
              <FiHelpCircle className="mr-3 h-5 w-5 text-gray-600" />
              <span className="flex-1">Need help? Contact support</span>
              <FiChevronRight className="h-5 w-5 text-gray-400" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex min-h-14 w-full items-center py-3 text-left text-[15px] font-medium text-red-600 disabled:opacity-60"
            >
              <FiLogOut className="mr-3 h-5 w-5" />
              {isLoggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>
      </AppBottomSheet>
    </>
  );
};

export default CompleteProfile;
