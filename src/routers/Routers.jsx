import React from "react";
import { Routes, Route } from "react-router-dom";
import ProductDetailPage from "../pages/UserSide/ProductDetail.jsx";
import Login from "../pages/Login.jsx";
import Signup from "../pages/Signup.jsx";
import NotificationsPage from "../pages/UserSide/Notifications.jsx";
import ForgetPassword from "../pages/forgetPassword.jsx";
import Donate from "../pages/Donate.jsx";
import VendorSignup from "../pages/VendorSignup.jsx";
import AuthActionHandler from "../custom-hooks/Authhandler.jsx";
import VendorOrders from "../pages/Orders/VendorOrders.jsx";
import VendorLogin from "../pages/VendorLogin.jsx";
import VendorDashboard from "../pages/VendorCompleteProfile/vendordashboard.jsx";
import FavoritesPage from "../pages/UserSide/FavoritesProducts.jsx";
import VendorProducts from "../pages/VendorCompleteProfile/VendorProducts.jsx";
import VendorProfile from "../pages/VendorCompleteProfile/VendorProfile.jsx";
import VendorVerifyOTP from "../pages/vendor/VerifyOtp.jsx";
import MarketStorePage from "../pages/MarketStorePage.jsx";
import PayPage from "../pages/UserSide/PayPage.jsx";
import Marketpg from "../pages/Marketpg.jsx";
import ResetPassword from "../pages/UserSide/ResetPassword.jsx";
import CompleteProfile from "../pages/VendorCompleteProfile/CompleteVendorProfile.jsx";
import NewHome from "../pages/Homepage.jsx";
import EmailVerification from "../pages/UserSide/ConfirmEmail.jsx";
import LatestCart from "../pages/Cart.jsx";
import OrdersCentre from "../pages/UserSide/OrdersCentre.jsx";
import Checkout from "../pages/NewCheckout.jsx";
import MarketVendors from "../pages/MarketVendors.jsx";
import Profile from "../pages/Profile.jsx";
import ConditionProducts from "../components/Conditions/ConditionPage.jsx";
import Explore from "../pages/Explore.jsx";
import Marketcardpage from "../pages/marketcardpage.jsx";
import OnlineVendors from "../pages/OnlineVendors.jsx";
import ConfirmUserState from "../pages/ConfirmUserState.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import StorePage from "../pages/StorePage.jsx";
import CategoryPage from "../pages/UserSide/CategoryPage.jsx";
import VendorRatings from "../pages/vendor/VendorRatings.jsx";
import SearchPage from "../pages/UserSide/Searchpage.jsx";
import InAppDiscountProducts from "../pages/UserSide/InAppDiscountProducts.jsx";
import ErrorBoundary from "../components/Errorboundary.jsx";
import TermsAndConditions from "../pages/Legal/TermsAndConditions.jsx";
import CallGuide from "../pages/Legal/CallGuide.jsx";
import DeliveryGuide from "../pages/Legal/DeliveryGuide.jsx";
import PrivacyPolicy from "../pages/Legal/PrivacyPolicy.jsx";
import NotFound from "../pages/NotFound.jsx";
import VendorChat from "../pages/vendor/VendorChat.jsx";
import VendorChatList from "../pages/vendor/VendorChatList.jsx";
import StoreReviews from "../pages/vendor/StoreReviews.jsx";
import RoleBasedAccess from "../custom-hooks/Rbac.jsx"; // Assuming this is the RoleBasedAccess component
import { Navigate } from "react-router-dom";
import WalletPage from "../pages/vendor/WalletPage.jsx";
import WithAnswerModal from "../components/Reviews/WithAnswerModal.jsx";
import PersonalDiscountsPage from "../components/Discounts/PersonalDiscountsPage.jsx";
import WithReviewModal from "../components/Reviews/WithReview.jsx";
import CategoryProducts from "../components/PopularCategories/CategorySection.jsx";
import SubmitFeedback from "../pages/SubmitFeedback.jsx";
import WithWalletSetupModal from "../components/Reviews/WithWalletSetupModal.jsx";
import WithWhatsAppModal from "../components/layout/WithPwaInstallModal.jsx";
import WithPwaInstallModal from "./../components/layout/WithPwaInstallModal";
const Routers = () => {
  return (
    <WithPwaInstallModal>
      <Routes>
        {/* Default Route */}
        <Route path="/" element={<ConfirmUserState />} />

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
          path="/producttype/:type"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <CategoryProducts />
            </RoleBasedAccess>
          }
        />
        <Route
          path="/newhome"
          element={
            <RoleBasedAccess allowedRoles={["user"]}>
              <WithAnswerModal>
                <WithReviewModal>
                  <NewHome />
                </WithReviewModal>
              </WithAnswerModal>
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
          path="/discounts-today"
          element={
            <RoleBasedAccess allowedRoles={["user", null]}>
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
          <Route
            path="/vendordashboard"
            element={
              <WithWalletSetupModal>
                <VendorDashboard />
              </WithWalletSetupModal>
            }
          />
          <Route path="/vendor-profile" element={<VendorProfile />} />
          <Route
            path="/vendor-products"
            element={
              <WithWalletSetupModal>
                <VendorProducts />
              </WithWalletSetupModal>
            }
          />
          <Route path="/vendor-wallet" element={<WalletPage />} />
          <Route
            path="/vendor-orders"
            element={
              <WithWalletSetupModal>
                <VendorOrders />
              </WithWalletSetupModal>
            }
          />
          <Route
            path="/store-reviews"
            element={
              /*<WithWhatsAppModal>*/ <StoreReviews /> /*</WithWhatsAppModal>*/
            }
          />
          <Route
            path="/vchats"
            element={
              <WithWalletSetupModal>
                <VendorChatList />
              </WithWalletSetupModal>
            }
          />
          <Route path="/vchats/:inquiryId" element={<VendorChat />} />
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
    </WithPwaInstallModal>
  );
};

export default Routers;
