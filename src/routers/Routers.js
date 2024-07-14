import { Routes, Route, Navigate } from "react-router-dom";

import ProductDetailPage from "../pages/UserSide/ProductDetail";
// import Checkout from "../pages/Checkout";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import ForgetPassword from "../pages/forgetPassword.jsx";

import VendorSignup from "../pages/VendorSignup";
import VendorOrders from "../pages/VendorCompleteProfile/VendorOrders.jsx";
import VendorLogin from "../pages/VendorLogin";
import VendorDashboard from "../pages/VendorCompleteProfile/vendordashboard.jsx";

import VendorProducts from "../pages/VendorCompleteProfile/VendorProducts.jsx";
import VendorProfile from "../pages/VendorCompleteProfile/VendorProfile.jsx";

import UserDashboard from "../pages/UserDashboard";
import Marketpg from "../pages/Marketpg";
import CompleteProfile from "../pages/VendorCompleteProfile/CompleteVendorProfile.jsx";
import NewHome from "../pages/Homepage";
import LatestCart from "../pages/Cart.jsx";
import MarketVendors from "../pages/MarketVendors.jsx";
import Profile from "../pages/Profile";
import Explore from "../pages/Explore";
import Marketcardpage from "../pages/marketcardpage.jsx";
import OnlineVendors from "../pages/OnlineVendors.jsx";
import ConfirmUserState from "../pages/ConfirmUserState.jsx";
import ProtectedRoute from "./ProtectedRoute";
import StorePage from "../pages/StorePage.jsx";

const Routers = () => {
  return (
    <Routes>
      <Route path="/confirm-user-state" element={<ConfirmUserState />} />
      <Route path="/" element={<Navigate to="confirm-user-state" />} />

      {/* <Route path="checkout" element={<Checkout />} /> */}
      <Route path="product/:id" element={<ProductDetailPage />} />
      <Route path="signup" element={<Signup />} />
      <Route path="complete-profile" element={<CompleteProfile />} />
      <Route path="vendor-signup" element={<VendorSignup />} />
      <Route path="login" element={<Login />} />
      <Route path="market-vendors" element={<MarketVendors />} />
      <Route path="online-vendors" element={<OnlineVendors />} />
      <Route path="/forgetpassword" element={<ForgetPassword />} />
      <Route path="/store/:id" element={<StorePage />} />
      <Route path="vendorlogin" element={<VendorLogin />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="newhome" element={<NewHome />} />
        <Route path="latest-cart" element={<LatestCart />} />
        <Route path="browse-markets" element={<Marketpg />} />
        <Route path="market-card/:marketName" element={<Marketcardpage />} />
        <Route path="explore" element={<Explore />} />
        <Route path="profile" element={<Profile />} />
        <Route path="user-dashboard" element={<UserDashboard />} />
        <Route path="vendordashboard" element={<VendorDashboard />} />
        <Route path="vendor-profile" element={<VendorProfile />} />
        <Route path="vendor-products" element={<VendorProducts />} />
        <Route path="vendor-orders" element={<VendorOrders />} />
      </Route>
    </Routes>
  );
};

export default Routers;
