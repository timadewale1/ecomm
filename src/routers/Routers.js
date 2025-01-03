import React from "react";
import { Routes, Route } from "react-router-dom";
import ProductDetailPage from "../pages/UserSide/ProductDetail";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import NotificationsPage from "../pages/UserSide/Notifications.jsx";
import ForgetPassword from "../pages/forgetPassword.jsx";
import Donate from "../pages/Donate.jsx";
import VendorSignup from "../pages/VendorSignup";
import AuthActionHandler from "../custom-hooks/Authhandler.jsx";
import VendorOrders from "../pages/Orders/VendorOrders.jsx";
import VendorLogin from "../pages/VendorLogin";
import VendorDashboard from "../pages/VendorCompleteProfile/vendordashboard.jsx";
import FavoritesPage from "../pages/UserSide/FavoritesProducts.jsx";
import VendorProducts from "../pages/VendorCompleteProfile/VendorProducts.jsx";
import VendorProfile from "../pages/VendorCompleteProfile/VendorProfile.jsx";
import VendorVerifyOTP from "../pages/vendor/VerifyOtp.jsx";
import MarketStorePage from "../pages/MarketStorePage.jsx";

import Marketpg from "../pages/Marketpg";
import ResetPassword from "../pages/UserSide/ResetPassword.jsx";
import CompleteProfile from "../pages/VendorCompleteProfile/CompleteVendorProfile.jsx";
import NewHome from "../pages/Homepage";
import EmailVerification from "../pages/UserSide/ConfirmEmail.jsx";
import LatestCart from "../pages/Cart.jsx";
import OrdersCentre from "../pages/UserSide/OrdersCentre.jsx";
import Checkout from "../pages/NewCheckout.jsx";
import MarketVendors from "../pages/MarketVendors.jsx";
import Profile from "../pages/Profile.jsx";
import Explore from "../pages/Explore";
import Marketcardpage from "../pages/marketcardpage.jsx";
import OnlineVendors from "../pages/OnlineVendors.jsx";
import ConfirmUserState from "../pages/ConfirmUserState.jsx";
import ProtectedRoute from "./ProtectedRoute";
import StorePage from "../pages/StorePage.jsx";
import CategoryPage from "../pages/UserSide/CategoryPage.jsx";
import VendorRatings from "../pages/vendor/VendorRatings.jsx";
import SearchPage from "../pages/UserSide/Searchpage.jsx";
import ErrorBoundary from "../components/Errorboundary.jsx";
import TermsAndConditions from "../pages/Legal/TermsAndConditions.jsx";
import CallGuide from "../pages/Legal/CallGuide.jsx";
import DeliveryGuide from "../pages/Legal/DeliveryGuide.jsx";
import PrivacyPolicy from "../pages/Legal/PrivacyPolicy.jsx";
import NotFound from "../pages/NotFound";
import StoreReviews from "../pages/vendor/StoreReviews.jsx";
import RoleBasedAccess from "../custom-hooks/Rbac.jsx"; // Assuming this is the RoleBasedAccess component
import { Navigate } from "react-router-dom";
import WithReviewModal from "../components/Reviews/WithReview.jsx";
// import VendorVerifyOTP from "../pages/vendor/VerifyOtp.jsx";
import SubmitFeedback from "../pages/SubmitFeedback.jsx";
const Routers = () => {
  return (
    <Routes>
      {/* Default Route */}
      <Route path="/" element={<ConfirmUserState />} />

      {/* Public Routes */}

      <Route path="/confirm-state" element={<ConfirmUserState />} />
      <Route path="product/:id" element={<ProductDetailPage />} />
      <Route path="signup" element={<Signup />} />

      <Route path="vendor-signup" element={<VendorSignup />} />
      <Route path="login" element={<Login />} />
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
      {/* Apply Role-Based Access to Specific Routes */}
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

      {/* Vendor Protected Routes */}
      <Route element={<ProtectedRoute requiredRole="vendor" />}>
        <Route path="/vendordashboard" element={<VendorDashboard />} />
        <Route path="/vendor-profile" element={<VendorProfile />} />
        <Route path="/vendor-products" element={<VendorProducts />} />
        <Route path="/vendor-orders" element={<VendorOrders />} />
        <Route path="/store-reviews" element={<StoreReviews />} />
        <Route path="/call-guidelines" element={<CallGuide />} />
        <Route path="/delivery-guidelines" element={<DeliveryGuide />} />
        {/* Add any other vendor-specific protected routes here */}
      </Route>

      {/* User Protected Routes */}
      <Route element={<ProtectedRoute requiredRole="user" />}>
        <Route path="/newcheckout/:vendorId" element={<Checkout />} />
        <Route path="/donate" element={<Donate />} />
      </Route>

      <Route path="/not-found" element={<NotFound />} />
      {/* Catch-all Route for NotFound */}
      <Route path="*" element={<Navigate to="/not-found" />} />
    </Routes>
  );
};

export default Routers;
