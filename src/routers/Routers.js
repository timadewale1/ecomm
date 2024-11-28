import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import MarketStorePage from "../pages/MarketStorePage.jsx";
import UserDashboard from "../pages/UserDashboard";
import Marketpg from "../pages/Marketpg";
import ResetPassword from "../pages/UserSide/ResetPassword.jsx";
import PaymentApprove from "../pages/PaymentApprove.jsx";
import CompleteProfile from "../pages/VendorCompleteProfile/CompleteVendorProfile.jsx";
import NewHome from "../pages/Homepage";
import EmailVerification from "../pages/UserSide/ConfirmEmail.jsx";
import LatestCart from "../pages/Cart.jsx";
import VendorVerifyOTP from "../pages/vendor/VerifyOtp.jsx";
import OrdersCentre from "../pages/UserSide/OrdersCentre.jsx";
import VendorReviews from "../pages/vendor/VendorReviews.jsx";
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
import NotFound from "../pages/NotFound"; // Import the NotFound component

const Routers = () => {
  return (
    <Routes>
      {/* Default Route */}
      <Route path="/" element={<ConfirmUserState />} />{" "}
      {/* Updated default route */}
      {/* Public Routes */}
      <Route path="/search" element={<SearchPage />} />
      <Route path="/confirm-user-state" element={<ConfirmUserState />} />
      <Route path="product/:id" element={<ProductDetailPage />} />
      <Route path="signup" element={<Signup />} />
      <Route path="vendor-signup" element={<VendorSignup />} />
      <Route path="login" element={<Login />} />
      <Route path="vendorlogin" element={<VendorLogin />} />
      <Route path="complete-profile" element={<CompleteProfile />} />
      <Route
        path="browse-markets"
        element={
          <ErrorBoundary>
            <Marketpg />
          </ErrorBoundary>
        }
      />
      <Route path="market-vendors" element={<MarketVendors />} />
      <Route path="online-vendors" element={<OnlineVendors />} />
      <Route path="/forgetpassword" element={<ForgetPassword />} />
      <Route path="reset-password" element={<ResetPassword />} />
      <Route path="/confirm-email" element={<EmailVerification />} />
      <Route path="/auth-action" element={<AuthActionHandler />} />
      <Route path="/store/:id" element={<StorePage />} />
      <Route path="/category/:category" element={<CategoryPage />} />
      <Route path="/vendor-verify-otp" element={<VendorVerifyOTP />} />
      <Route path="marketstorepage/:id" element={<MarketStorePage />} />
      {/* Vendor Protected Routes */}
      <Route element={<ProtectedRoute requiredRole="vendor" />}>
        <Route path="vendordashboard" element={<VendorDashboard />} />
        <Route path="vendor-profile" element={<VendorProfile />} />
        <Route path="vendor-reviews" element={<VendorReviews />} />
        <Route path="vendor-products" element={<VendorProducts />} />
        <Route path="vendor-orders" element={<VendorOrders />} />
        {/* Add any other vendor-specific protected routes here */}
      </Route>
      {/* User Protected Routes */}
      <Route element={<ProtectedRoute requiredRole="user" />}>
        <Route path="newhome" element={<NewHome />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="latest-cart" element={<LatestCart />} />
        <Route path="newcheckout/:vendorId" element={<Checkout />} />
        <Route path="user-orders" element={<OrdersCentre />} />
        {/* <Route path="newcheckout/fulldelivery" element={<FullDelivery />} /> */}
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="market-card/:marketName" element={<Marketcardpage />} />
        <Route path="explore" element={<Explore />} />
        <Route path="donate" element={<Donate />} />
        <Route path="payment-approve" element={<PaymentApprove />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="user-dashboard" element={<UserDashboard />} />
        <Route path="/reviews/:id" element={<VendorRatings />} />
        {/* Add any other user-specific protected routes here */}
      </Route>
      {/* Catch-all Route for NotFound */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default Routers;
