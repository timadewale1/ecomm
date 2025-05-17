import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.jsx";
import RoleBasedAccess from "../custom-hooks/Rbac.jsx";
import Loading from "../components/Loading/Loading.jsx";

// Public pages
const ConfirmUserState = lazy(() => import("../pages/ConfirmUserState.jsx"));
const ProductDetailPage = lazy(() =>
  import("../pages/UserSide/ProductDetail.jsx")
);
const Signup = lazy(() => import("../pages/Signup.jsx"));
const Login = lazy(() => import("../pages/Login.jsx"));
const VendorSignup = lazy(() => import("../pages/VendorSignup.jsx"));
const VendorLogin = lazy(() => import("../pages/VendorLogin.jsx"));
const CompleteProfile = lazy(() =>
  import("../pages/VendorCompleteProfile/CompleteVendorProfile.jsx")
);
const ForgetPassword = lazy(() => import("../pages/forgetPassword.jsx"));
const ResetPassword = lazy(() => import("../pages/UserSide/ResetPassword.jsx"));
const EmailVerification = lazy(() =>
  import("../pages/UserSide/ConfirmEmail.jsx")
);
const AuthActionHandler = lazy(() => import("../custom-hooks/Authhandler.jsx"));
const VendorVerifyOTP = lazy(() => import("../pages/vendor/VerifyOtp.jsx"));
const TermsAndConditions = lazy(() =>
  import("../pages/Legal/TermsAndConditions.jsx")
);
const PrivacyPolicy = lazy(() => import("../pages/Legal/PrivacyPolicy.jsx"));
const SubmitFeedback = lazy(() => import("../pages/SubmitFeedback.jsx"));

// Discounts
const InAppDiscountProducts = lazy(() =>
  import("../pages/UserSide/InAppDiscountProducts.jsx")
);
const PersonalDiscountsPage = lazy(() =>
  import("../components/Discounts/PersonalDiscountsPage.jsx")
);

// User-only (role-protected)
const Profile = lazy(() => import("../pages/Profile.jsx"));
const NewHome = lazy(() => import("../pages/Homepage.jsx"));
const FavoritesPage = lazy(() =>
  import("../pages/UserSide/FavoritesProducts.jsx")
);
const SearchPage = lazy(() => import("../pages/UserSide/Searchpage.jsx"));
const OrdersCentre = lazy(() => import("../pages/UserSide/OrdersCentre.jsx"));
const LatestCart = lazy(() => import("../pages/Cart.jsx"));
const NotificationsPage = lazy(() =>
  import("../pages/UserSide/Notifications.jsx")
);
const MarketStorePage = lazy(() => import("../pages/MarketStorePage.jsx"));
const StorePage = lazy(() => import("../pages/StorePage.jsx"));
const CategoryPage = lazy(() => import("../pages/UserSide/CategoryPage.jsx"));
const MarketVendors = lazy(() => import("../pages/MarketVendors.jsx"));
const OnlineVendors = lazy(() => import("../pages/OnlineVendors.jsx"));
const CategoryProducts = lazy(() =>
  import("../components/PopularCategories/CategorySection.jsx")
);
const ConditionProducts = lazy(() =>
  import("../components/Conditions/ConditionPage.jsx")
);
const Explore = lazy(() => import("../pages/Explore.jsx"));
const Marketpg = lazy(() => import("../pages/Marketpg.jsx"));
const Marketcardpage = lazy(() => import("../pages/marketcardpage.jsx"));
const VendorRatings = lazy(() => import("../pages/vendor/VendorRatings.jsx"));
const WithReviewModal = lazy(() =>
  import("../components/Reviews/WithReview.jsx")
);

// Vendor-only (protected)
const VendorDashboard = lazy(() =>
  import("../pages/VendorCompleteProfile/vendordashboard.jsx")
);
const VendorProfile = lazy(() =>
  import("../pages/VendorCompleteProfile/VendorProfile.jsx")
);
const VendorProducts = lazy(() =>
  import("../pages/VendorCompleteProfile/VendorProducts.jsx")
);
const VendorOrders = lazy(() => import("../pages/Orders/VendorOrders.jsx"));
const StoreReviews = lazy(() => import("../pages/vendor/StoreReviews.jsx"));
const CallGuide = lazy(() => import("../pages/Legal/CallGuide.jsx"));
const DeliveryGuide = lazy(() => import("../pages/Legal/DeliveryGuide.jsx"));

// Checkout & donate
const Checkout = lazy(() => import("../pages/NewCheckout.jsx"));
const Donate = lazy(() => import("../pages/Donate.jsx"));

// Error boundary (needed for that one route)
const ErrorBoundary = lazy(() => import("../components/Errorboundary.jsx"));

const NotFound = lazy(() => import("../pages/NotFound.jsx"));

export default function Routers() {
  return (
    <Suspense
      fallback={
        <div className="loading">
          {" "}
          <Loading />{" "}
        </div>
      }
    >
      <Routes>
        {/* Public */}
        <Route path="/" element={<ConfirmUserState />} />
        <Route path="/confirm-state" element={<ConfirmUserState />} />
        <Route path="product/:id" element={<ProductDetailPage />} />
        <Route path="signup" element={<Signup />} />
        <Route path="login" element={<Login />} />
        <Route path="vendor-signup" element={<VendorSignup />} />
        <Route path="vendorlogin" element={<VendorLogin />} />
        <Route path="complete-profile" element={<CompleteProfile />} />
        <Route path="/forgetpassword" element={<ForgetPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="/confirm-email" element={<EmailVerification />} />
        <Route path="/auth-action" element={<AuthActionHandler />} />
        <Route path="/vendor-verify-otp" element={<VendorVerifyOTP />} />
        <Route path="terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/send-us-feedback" element={<SubmitFeedback />} />

        {/* Discounts */}
        <Route
          path="/inapp-discounts/:discountName"
          element={<InAppDiscountProducts />}
        />
        <Route path="/discounts-today" element={<PersonalDiscountsPage />} />

        {/* Role-based users */}
        <Route
          path="/profile"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <WithReviewModal>
                <Profile />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
        <Route
          path="/newhome"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <WithReviewModal>
                <NewHome />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
        <Route
          path="/favorites"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
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
              <OrdersCentre />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/latest-cart"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <WithReviewModal>
                <LatestCart />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
        <Route
          path="/notifications"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <NotificationsPage />
            </RoleBasedAccess>
          }
        />

        {/* Market & store */}
        <Route
          path="/marketstorepage/:id"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <MarketStorePage />
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
              <CategoryPage />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/producttype/:type"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <CategoryProducts />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/products/condition/:condition"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <WithReviewModal>
                <ConditionProducts />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />

        {/* Explore & vendors */}
        <Route
          path="/market-vendors"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <MarketVendors />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/online-vendors"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <OnlineVendors />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/browse-markets"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <WithReviewModal>
                <ErrorBoundary>
                  <Marketpg />
                </ErrorBoundary>
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
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
                <Explore />
              </WithReviewModal>
            </RoleBasedAccess>
          }
        />
        <Route
          path="/reviews/:id"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
              <VendorRatings />
            </RoleBasedAccess>
          }
        />

        {/* Vendor protected */}
        <Route element={<ProtectedRoute requiredRole="vendor" />}>
          <Route path="/vendordashboard" element={<VendorDashboard />} />
          <Route path="/vendor-profile" element={<VendorProfile />} />
          <Route path="/vendor-products" element={<VendorProducts />} />
          <Route path="/vendor-orders" element={<VendorOrders />} />
          <Route path="/store-reviews" element={<StoreReviews />} />
          <Route path="/call-guidelines" element={<CallGuide />} />
          <Route path="/delivery-guidelines" element={<DeliveryGuide />} />
        </Route>

        {/* User protected */}
        <Route element={<ProtectedRoute requiredRole="user" />}>
          <Route path="/newcheckout/:vendorId" element={<Checkout />} />
          <Route path="/donate" element={<Donate />} />
        </Route>

        {/* 404 */}
        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/not-found" />} />
      </Routes>
    </Suspense>
  );
}
