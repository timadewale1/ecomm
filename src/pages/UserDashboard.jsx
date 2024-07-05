import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "reactstrap";
import "../styles/dashboard.css";
import { auth } from "../firebase.config";
import { getUserRole } from "../admin/getUserRole";
import useGetData from "../custom-hooks/useGetData";
import { useNavigate } from "react-router-dom";

const UserDashboard = () => {
  const [isUser, setIsUser] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const navigate = useNavigate();
  const { data: orders } = useGetData("orders");

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const user = auth.currentUser;
        setIsSignedIn(!!user); // Check if the user is signed in
        if (user) {
          const userRole = await getUserRole(user.uid);
          setIsUser(userRole === "user");
        } else {
          setIsUser(false);
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };

    checkUserRole();
  }, []);

  if (!isSignedIn) {
    // Redirect to sign-in page or show a message indicating that the user needs to sign in
    navigate("/login");
    return null;
  }

  if (!isUser) {
    // Redirect to the home page or show a message indicating insufficient privileges
    navigate("/user-dashboard"); // Redirect to the home page for non-user users
    return null;
  }

  // Calculate total amount spent by the user
  const totalAmountSpent = orders
    .filter((order) => order.userId === auth.currentUser.uid)
    .reduce((total, order) => total + order.totalAmount, 0);

  // Get orders made by the user
  const userOrders = orders.filter(
    (order) => order.userId === auth.currentUser.uid
  );

  // Get delivered orders to the user
  const deliveredOrders = userOrders.filter(
    (order) => order.status === "Delivered"
  );

  return (
    <section>
      <Container>
        <Row>
          <Col className="lg-3">
            <div className="amount-spent__box">
              <h5>Total Amount Spent</h5>
              <span>${totalAmountSpent}</span>
            </div>
          </Col>
          <Col className="lg-3">
            <div className="order__box">
              <h5>Orders Made</h5>
              <span>{userOrders.length}</span>
            </div>
          </Col>
          <Col className="lg-3">
            <div className="delivered-orders__box">
              <h5>Delivered Orders</h5>
              <span>{deliveredOrders.length}</span>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default UserDashboard;
