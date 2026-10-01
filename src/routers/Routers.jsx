import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import Loading from "../components/Loading/Loading.jsx";
import { AuthRoutePending, AuthRouteReady } from "../components/Auth/AuthRouteProgress";
import StockpileNudge from "../components/StockpileNudge.jsx";
// Non-lazy loaded components (bottom bar routes, Checkout, StorePage)
import Checkout from "../pages/NewCheckout.jsx";
import StorePage from "../pages/StorePage.jsx";
import WithCommunityModal from "../components/layout/WithCommunityinviteModal.jsx";
import WithStoreCelebrationModal from "../components/layout/WithStoreCelebrationModal.jsx";
import WithDeliveryPreferenceModal from "../components/layout/WithDeliveryChoice.jsx";
import InfluencerRedir from "../pages/UserSide/InfluencerRedir.jsx";

// Lazy load all other components
const ProductDetailPage = lazy(() =>
  import("../pages/UserSide/ProductDetail.jsx")
);
const Login = lazy(() => import("../pages/Login.jsx"));
const Signup = lazy(() => import("../pages/Signup.jsx"));
const NotificationsPage = lazy(() =>
  import("../pages/UserSide/Notifications.jsx")
);
const ForgetPassword = lazy(() => import("../pages/forgetPassword.jsx"));
const Donate = lazy(() => import("../pages/Donate.jsx"));
const VendorSignup = lazy(() => import("../pages/VendorSignup.jsx"));
const AuthActionHandler = lazy(() => import("../custom-hooks/Authhandler.jsx"));
const VendorOrders = lazy(() => import("../pages/Orders/VendorOrders.jsx"));
const VendorLogin = lazy(() => import("../pages/VendorLogin.jsx"));
const VendorDashboard = lazy(() =>
  import("../pages/VendorCompleteProfile/vendordashboard.jsx")
);
const FavoritesPage = lazy(() =>
  import("../pages/UserSide/FavoritesProducts.jsx")
);
const FAQs = lazy(() => import("../pages/UserSide/FAQs.jsx"));
const VendorProducts = lazy(() =>
  import("../pages/VendorCompleteProfile/VendorProducts.jsx")
);
const UserWalletPage = lazy(() =>
  import("../pages/UserSide/WalletPageUser.jsx")
);
const VendorProfile = lazy(() =>
  import("../pages/VendorCompleteProfile/VendorProfile.jsx")
);
const CategoryProduct = lazy(() =>
  import("../components/Categories/CategoryP.jsx")
);

const VendorVerifyOTP = lazy(() => import("../pages/vendor/VerifyOtp.jsx"));
const PayPage = lazy(() => import("../pages/UserSide/PayPage.jsx"));
const ResetPassword = lazy(() => import("../pages/UserSide/ResetPassword.jsx"));
const CompleteProfile = lazy(() =>
  import("../pages/VendorCompleteProfile/CompleteVendorProfile.jsx")
);
const NewHome = lazy(() => import("../pages/Homepage.jsx"));
const EmailVerification = lazy(() =>
  import("../pages/UserSide/ConfirmEmail.jsx")
);
const ProductQuestionVerification = lazy(() =>
  import("../pages/UserSide/VerifyProductQuestion.jsx")
);
const LatestCart = lazy(() => import("../pages/Cart.jsx"));
const OrdersCentre = lazy(() => import("../pages/UserSide/OrdersCentre.jsx"));
const UserOffers = lazy(() => import("../pages/UserSide/UserOffers.jsx"));
const UserOfferDetail = lazy(() =>
  import("../pages/UserSide/LegacyOfferConversationRedirect.jsx")
);
const OfferConversation = lazy(() => import("../pages/OfferConversation.jsx"));

const MarketVendors = lazy(() => import("../pages/MarketVendors.jsx"));
const Profile = lazy(() => import("../pages/Profile.jsx"));
const SettingsPage = lazy(() => import("../pages/UserSide/Settings.jsx"));
const AccountInfoPage = lazy(() => import("../pages/UserSide/AccountInfo.jsx"));
const MySizesPage = lazy(() => import("../pages/UserSide/MySizes.jsx"));
const ConditionProducts = lazy(() =>
  import("../components/Conditions/ConditionPage.jsx")
);
const Categories = lazy(() => import("../pages/Categories.jsx"));
const LegacyExplore = lazy(() => import("../pages/Explore.jsx"));
const Marketcardpage = lazy(() => import("../pages/marketcardpage.jsx"));
const OnlineVendors = lazy(() => import("../pages/OnlineVendors.jsx"));
const ConfirmUserState = lazy(() => import("../pages/ConfirmUserState.jsx"));
const ProtectedRoute = lazy(() => import("./ProtectedRoute.jsx"));
const CategoryPage = lazy(() => import("../pages/UserSide/CategoryPage.jsx"));
const SearchPage = lazy(() => import("../pages/UserSide/Searchpage.jsx"));
const InAppDiscountProducts = lazy(() =>
  import("../pages/UserSide/InAppDiscountProducts.jsx")
);
const TermsAndConditions = lazy(() =>
  import("../pages/Legal/TermsAndConditions.jsx")
);
const CallGuide = lazy(() => import("../pages/Legal/CallGuide.jsx"));
const DeliveryGuide = lazy(() => import("../pages/Legal/DeliveryGuide.jsx"));
const PrivacyPolicy = lazy(() => import("../pages/Legal/PrivacyPolicy.jsx"));
const NotFound = lazy(() => import("../pages/NotFound.jsx"));
const VendorChat = lazy(() => import("../pages/vendor/VendorChat.jsx"));
const VendorChatList = lazy(() => import("../pages/vendor/VendorChatList.jsx"));
const StoreReviews = lazy(() => import("../pages/vendor/StoreReviews.jsx"));
const RoleBasedAccess = lazy(() => import("../custom-hooks/Rbac.jsx"));
const WalletPage = lazy(() => import("../pages/vendor/WalletPage.jsx"));
const PersonalDiscountsPage = lazy(() =>
  import("../components/Discounts/PersonalDiscountsPage.jsx")
);
const WithReviewModal = lazy(() =>
  import("../components/Reviews/WithReview.jsx")
);
const CategoryProducts = lazy(() =>
  import("../components/PopularCategories/CategorySection.jsx")
);
const SubmitFeedback = lazy(() => import("../pages/SubmitFeedback.jsx"));
const WithWalletSetupModal = lazy(() =>
  import("../components/Reviews/WithWalletSetupModal.jsx")
);
const WithPickupPrompt = lazy(() =>
  import("../components/Reviews/withPickupModal.jsx")
);

const LegacyVendorReviewsRedirect = () => {
  const { id } = useParams();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set("tab", "reviews");
  return <Navigate to={`/store/${id}?${params.toString()}`} replace />;
};

const Routers = () => {
  return (
    <Suspense fallback={<AuthRoutePending />}>
      <Routes>
        {/* Default Route */}
        <Route
          path="/confirm-user"
          element={<Navigate to="/confirm-state" replace />}
        />

        {/* Public Routes */}
        <Route path="/pay/:token" element={<PayPage />} />
        <Route path="/confirm-state" element={<ConfirmUserState />} />
        <Route path="product/:id" element={<ProductDetailPage />} />
        <Route path="signup" element={<Signup />} />
        <Route
          path="/inapp-discounts/:discountName"
          element={<InAppDiscountProducts />}
        />
        <Route path="vendor-signup" element={<VendorSignup />} />
        <Route path="login" element={<Login />} />
        <Route path="vendorlogin" element={<VendorLogin />} />
        <Route path="/i/:id" element={<InfluencerRedir />} />
        <Route path="/forgetpassword" element={<ForgetPassword />} />
        <Route path="/faqs" element={<FAQs />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="/confirm-email" element={<EmailVerification />} />
        <Route
          path="/verify-question"
          element={<ProductQuestionVerification />}
        />
        <Route path="/auth-action" element={<AuthActionHandler />} />
        <Route path="/vendor-verify-otp" element={<VendorVerifyOTP />} />
        <Route path="terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/send-us-feedback" element={<SubmitFeedback />} />
        <Route
          path="/offer-conversations/:conversationId"
          element={<OfferConversation />}
        />
        {/* Apply Role-Based Access to Specific Routes */}
        <Route
          path="/profile"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <WithReviewModal>
                <StockpileNudge />
                <Profile />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
        <Route
          path="/settings"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <SettingsPage />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/account-info"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <AccountInfoPage />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/your-wallet"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <WithReviewModal>
                <StockpileNudge />
                <UserWalletPage />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
        <Route
          path="/wallet-transactions"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <WithReviewModal>
                <StockpileNudge />
                <UserWalletPage />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
        <Route
          path="/producttype/:type"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <StockpileNudge />
              <CategoryProducts />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <WithReviewModal>
                <StockpileNudge />
                <NewHome />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
        <Route
          path="/products/condition/:condition"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <WithReviewModal>
                <StockpileNudge />
                <ConditionProducts />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
        <Route
          path="/favorites"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <StockpileNudge />
              <FavoritesPage />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/search"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <SearchPage />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/user-orders"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <StockpileNudge />
              <OrdersCentre />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/offers"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <StockpileNudge />
              <UserOffers />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/offers/:offerId"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <StockpileNudge />
              <UserOfferDetail />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/latest-cart"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <WithReviewModal>
                <StockpileNudge />
                <LatestCart />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
        <Route
          path="/notifications"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <StockpileNudge />
              <NotificationsPage />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/marketstorepage/:id"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/discounts-today"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <StockpileNudge />
              <PersonalDiscountsPage />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/store/:id"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <StorePage />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/category/:category"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <StockpileNudge />
              <CategoryProduct />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/market-vendors"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <StockpileNudge />
              <MarketVendors />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/online-vendors"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <StockpileNudge />
              <OnlineVendors />
            </RoleBasedAccess>
          }
        />
        <Route path="/browse-markets" element={<Navigate to="/" replace />} />
        <Route
          path="/market-card/:marketName"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <Marketcardpage />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/explore"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <WithReviewModal>
                <StockpileNudge />
                <Categories />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
        <Route
          path="/explore/legacy"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <WithReviewModal>
                <StockpileNudge />
                <LegacyExplore />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
        <Route
          path="/reviews/:id"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <StockpileNudge />
              <LegacyVendorReviewsRedirect />
            </RoleBasedAccess>
          }
        />

        {/* Vendor Protected Routes */}
        <Route element={<ProtectedRoute requiredRole="vendor" />}>
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route
            path="/vendordashboard"
            element={
              <WithDeliveryPreferenceModal>
                {" "}
                <WithStoreCelebrationModal>
                  <WithWalletSetupModal>
                    <VendorDashboard />
                  </WithWalletSetupModal>
                </WithStoreCelebrationModal>
              </WithDeliveryPreferenceModal>
            }
          />
          <Route
            path="/vendor-profile"
            element={
              <WithStoreCelebrationModal>
                <VendorProfile />
              </WithStoreCelebrationModal>
            }
          />
          <Route
            path="/vendor-products"
            element={
              <WithStoreCelebrationModal>
                <WithWalletSetupModal>
                  <WithPickupPrompt>
                    <VendorProducts />
                  </WithPickupPrompt>
                </WithWalletSetupModal>
              </WithStoreCelebrationModal>
            }
          />
          <Route
            path="/vendor-orders"
            element={
              <WithStoreCelebrationModal>
                <WithWalletSetupModal>
                  <WithPickupPrompt>
                    <VendorOrders />
                  </WithPickupPrompt>
                </WithWalletSetupModal>
              </WithStoreCelebrationModal>
            }
          />
          <Route
            path="/vchats"
            element={
              <WithStoreCelebrationModal>
                <WithWalletSetupModal>
                  <VendorChatList />
                </WithWalletSetupModal>
              </WithStoreCelebrationModal>
            }
          />
          <Route path="/vchats/:inquiryId" element={<VendorChat />} />
          <Route path="/vendor-wallet" element={<WalletPage />} />
          <Route
            path="/store-reviews"
            element={
              /*<WithWhatsAppModal>*/ <StoreReviews /> /*</WithWhatsAppModal>*/
            }
          />
          <Route path="/call-guidelines" element={<CallGuide />} />
          <Route path="/delivery-guidelines" element={<DeliveryGuide />} />
          {/* Add any other vendor-specific protected routes here */}
        </Route>

        {/* User Protected Routes */}
        <Route element={<ProtectedRoute requiredRole="user" />}>
          <Route path="/my-sizes" element={<MySizesPage />} />
          <Route path="/newcheckout/:vendorId" element={<Checkout />} />
          <Route path="/donate" element={<Donate />} />
        </Route>

        <Route path="/not-found" element={<NotFound />} />
        {/* Catch-all Route for NotFound */}
        <Route path="*" element={<Navigate to="/not-found" />} />
      </Routes>
      <AuthRouteReady />
    </Suspense>
  );
};

export default Routers;
