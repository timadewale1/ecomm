import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProductDetailPage from "../pages/UserSide/ProductDetail";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import NotificationsPage from "../pages/UserSide/Notifications.jsx";
import ForgetPassword from "../pages/forgetPassword.jsx";
import Donate from "../pages/Donate.jsx";
import VendorSignup from "../pages/VendorSignup";
import VendorOrders from "../pages/VendorCompleteProfile/VendorOrders.jsx";
import VendorLogin from "../pages/VendorLogin";
import VendorDashboard from "../pages/VendorCompleteProfile/vendordashboard.jsx";
import FavoritesPage from "../pages/UserSide/FavoritesProducts.jsx";
import VendorProducts from "../pages/VendorCompleteProfile/VendorProducts.jsx";
import VendorProfile from "../pages/VendorCompleteProfile/VendorProfile.jsx";
import MarketStorePage from "../pages/MarketStorePage.jsx";
import UserDashboard from "../pages/UserDashboard";
import Marketpg from "../pages/Marketpg";
import PaymentApprove from "../pages/PaymentApprove.jsx";
import CompleteProfile from "../pages/VendorCompleteProfile/CompleteVendorProfile.jsx";
import NewHome from "../pages/Homepage";
import LatestCart from "../pages/Cart.jsx";
import OrdersCentre from "../pages/UserSide/OrdersCentre.jsx";
import FullDelivery from "../pages/FullDelivery.jsx";
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
import VendorNotificationPage from "../pages/VendorNotificationPage.jsx";
const Routers = () => {
  return (
    <Routes>
      <Route path="/search" element={<SearchPage />} />
      <Route path="/confirm-user-state" element={<ConfirmUserState />} />
      <Route path="/" element={<Navigate to="login" />} />
      <Route path="product/:id" element={<ProductDetailPage />} />
      <Route path="signup" element={<Signup />} />
      <Route path="complete-profile" element={<CompleteProfile />} />
      <Route path="vendor-signup" element={<VendorSignup />} />
      <Route path="login" element={<Login />} />
      <Route path="market-vendors" element={<MarketVendors />} />
      <Route path="online-vendors" element={<OnlineVendors />} />
      <Route path="/forgetpassword" element={<ForgetPassword />} />
      <Route path="/store/:id" element={<StorePage />} />
      <Route path="/category/:category" element={<CategoryPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="marketstorepage/:id" element={<MarketStorePage />} />
      <Route path="vendorlogin" element={<VendorLogin />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="newhome" element={<NewHome />} />
        <Route path="latest-cart" element={<LatestCart />} />
        <Route path="newcheckout/:vendorId" element={<Checkout />} />
        <Route path="user-orders" element={<OrdersCentre />} />
        <Route path="newcheckout/fulldelivery" element={<FullDelivery />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route
          path="browse-markets"
          element={
            <ErrorBoundary>
              <Marketpg />
            </ErrorBoundary>
          }
        />
        <Route path="market-card/:marketName" element={<Marketcardpage />} />
        <Route path="explore" element={<Explore />} />
        <Route path="donate" element={<Donate />} />
        <Route path="payment-approve" element={<PaymentApprove />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="user-dashboard" element={<UserDashboard />} />
        <Route path="vendordashboard" element={<VendorDashboard />} />
        <Route path="vendor-profile" element={<VendorProfile />} />
        <Route path="vendor-products" element={<VendorProducts />} />
        <Route path="vendor-notifications" element={<VendorNotificationPage />} />
        <Route path="vendor-orders" element={<VendorOrders />} />
        <Route path="/reviews/:id" element={<VendorRatings />} />
      </Route>
    </Routes>
  );
};

export default Routers;
