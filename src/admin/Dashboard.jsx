import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "reactstrap";
import "../styles/dashboard.css";
import { auth } from "../firebase.config";
import { getUserRole } from "./getUserRole";
import useGetData from "../custom-hooks/useGetData";
import { useNavigate } from "react-router-dom";
const Dashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [totalSales, setTotalSales] = useState(0); // State to store total sales

  const navigate = useNavigate();

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userRole = await getUserRole(user.uid);
          setIsAdmin(userRole === "admin");
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };

    checkUserRole();
  }, []);

  const { data: products } = useGetData("products");
  const { data: users } = useGetData("users");
  const { data: orders } = useGetData("orders");

  useEffect(() => {
    if (orders) {
      const totalAmount = orders.reduce(
        (sum, order) => sum + order.totalAmount,
        0
      );
      setTotalSales(totalAmount);
    }
  }, [orders]);

  // Render only if the user is an admin
  if (!isAdmin) {
    // Redirect to the login page or show a message indicating insufficient privileges
    navigate("/login"); // Redirect to the login page for non-admin users
    return null; // Return null to prevent rendering the dashboard content for non-admin users
  }

  return (
    <section>
      <Container>
        <Row>
          <Col className="lg-3">
            <div className="revenue__box">
              <h5>Total sales</h5>
              <span>${totalSales.toFixed(2)}</span>
            </div>
          </Col>
          <Col className="lg-3">
            <div className="order__box">
              <h5>Orders</h5>
              <span>{orders.length}</span>
            </div>
          </Col>
          <Col className="lg-3">
            <div className="products__box">
              <h5>Total Products</h5>
              <span>{products.length}</span>
            </div>
          </Col>
          <Col className="lg-3">
            <div className="users__box">
              <h5>Total Users</h5>
              <span>{users.length}</span>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default Dashboard;
