import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, ShoppingBag, Store } from "lucide-react";
import { RotatingLines } from "react-loader-spinner";
import logo from "../Images/logo.png";
import SEO from "../components/Helmet/SEO";
import { useAuth } from "../custom-hooks/useAuth";
import { useAppExperience } from "../components/Context/AppExperienceContext";
import { APP_EXPERIENCE } from "../services/appExperience";
import { appHaptics } from "../services/haptics";
import Loading from "../components/Loading/Loading";

const experienceOptions = [
  {
    id: APP_EXPERIENCE.CUSTOMER,
    title: "Shop as a customer",
    description: "Discover unique finds, make offers and shop trusted stores.",
    icon: ShoppingBag,
  },
  {
    id: APP_EXPERIENCE.VENDOR,
    title: "Sell as a vendor",
    description: "Set up your store, list products and manage your orders.",
    icon: Store,
  },
];

const ConfirmUserState = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: authLoading } = useAuth();
  const { ready: experienceReady, selectExperience } = useAppExperience();
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const chooseExperience = (experience) => {
    setSelectedExperience(experience);
    void appHaptics.selection();
  };

  const handleContinue = async () => {
    if (!selectedExperience || isProcessing) return;
    setIsProcessing(true);
    void appHaptics.medium();

    try {
      await selectExperience(selectedExperience);
      const requestedDestination =
        typeof location.state?.returnTo === "string" &&
        location.state.returnTo.startsWith("/") &&
        !location.state.returnTo.startsWith("//")
          ? location.state.returnTo
          : null;
      const requestedPath = requestedDestination?.split(/[?#]/)[0] || null;
      const isAuthEntry = [
        "/login",
        "/vendorlogin",
        "/confirm-state",
        "/confirm-user",
      ].includes(requestedPath);

      if (selectedExperience === APP_EXPERIENCE.VENDOR) {
        navigate("/vendorlogin", {
          replace: true,
          state: requestedDestination && !isAuthEntry
            ? { returnTo: requestedDestination }
            : undefined,
        });
      } else {
        navigate(
          isAuthEntry
            ? "/login"
            : requestedDestination || "/",
          { replace: true },
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!experienceReady || authLoading) return <Loading />;

  return (
    <>
      <SEO
        title="Choose your My Thrift experience"
        description="Choose whether you want to shop or sell on My Thrift."
        url="https://www.shopmythrift.store/confirm-state"
      />

      <main className="min-h-[100dvh] bg-white px-5 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-[calc(20px+env(safe-area-inset-top,0px))] font-satoshi text-gray-950">
        <div className="mx-auto flex min-h-[calc(100dvh-44px)] w-full max-w-md flex-col">
          <img
            src={logo}
            alt="My Thrift"
            className="h-10 w-auto self-start object-contain"
          />

          <section className="mt-12">
            <p className="text-sm font-semibold text-customOrange">
              WELCOME TO MY THRIFT
            </p>
            <h1 className="mt-2 max-w-sm text-[34px] font-semibold leading-[1.08] tracking-[-0.035em]">
              How will you use My Thrift?
            </h1>
            <p className="mt-3 max-w-sm text-base leading-6 text-gray-500">
              Choose the experience that fits you. You can change this later in
              Settings.
            </p>
          </section>

          <div
            className="mt-9 space-y-3"
            role="radiogroup"
            aria-label="Choose an app experience"
          >
            {experienceOptions.map((option) => {
              const selected = selectedExperience === option.id;
              const Icon = option.icon;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => chooseExperience(option.id)}
                  className={`relative flex w-full items-start gap-4 rounded-[22px] border p-5 text-left transition-colors ${
                    selected
                      ? "border-customOrange bg-[#fff6f2]"
                      : "border-gray-200 bg-white active:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      selected
                        ? "bg-customOrange text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
                  </span>

                  <span className="min-w-0 pr-7">
                    <span className="block text-[17px] font-semibold leading-6">
                      {option.title}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-gray-500">
                      {option.description}
                    </span>
                  </span>

                  <span
                    className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border ${
                      selected
                        ? "border-customOrange bg-customOrange text-white"
                        : "border-gray-300 bg-white text-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    <Check size={15} strokeWidth={2.5} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-8">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!selectedExperience || isProcessing}
              className={`flex h-14 w-full items-center justify-center rounded-md text-base font-semibold transition-colors ${
                selectedExperience
                  ? "bg-customOrange text-white active:bg-orange-600"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
              }`}
            >
              {isProcessing ? (
                <RotatingLines
                  strokeColor="#ffffff"
                  strokeWidth="5"
                  animationDuration="0.75"
                  width="24"
                  visible
                />
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </div>
      </main>
    </>
  );
};

export default ConfirmUserState;
