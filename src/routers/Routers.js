import { Routes, Route, Navigate } from "react-router-dom";

import Home from "../pages/Home";
import Shop from "../pages/Shop";
import Cart from "../pages/Cart";
import ProductDetails from "../pages/ProductDetails";
import Checkout from "../pages/Checkout";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import ForgetPassword from "../pages/forgetPassword";
import ProtectedRoute from "./ProtectedRoute";
import AdminLogin from "../pages/AdminLogin";
import AddProducts from "../admin/AddProducts";
import AllProducts from "../admin/AllProducts";
import Dashboard from "../admin/Dashboard";
import Payment from "../pages/Payment";
import Users from "../admin/Users";
import AllOrders from "../admin/Orders";
import UserDashboard from "../pages/UserDashboard";
const Routers = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="home" />} />
      <Route path="home" element={<Home />} />
      <Route path="shop" element={<Shop />} />
      <Route path="shop/:id" element={<ProductDetails />} />
      <Route path="checkout" element={<Checkout />} />
      <Route path="/*" element={<ProtectedRoute />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="dashboard/all-products" element={<AllProducts />} />
        <Route path="dashboard/add-product" element={<AddProducts />} />
        <Route path="dashboard/users" element={<Users />} />
        <Route path="dashboard/orders" element={<AllOrders />} />
      </Route>

      <Route path="cart" element={<Cart />} />
      <Route path="user-dashboard" element={<UserDashboard />} />
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route path="admin" element={<AdminLogin />} />
      <Route path="payment" element={<Payment />} />
      <Route path="/forgetpassword" element={<ForgetPassword />} />
    </Routes>
  );
};
export default Routers;
