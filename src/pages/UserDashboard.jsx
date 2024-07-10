import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "reactstrap";
import "../styles/dashboard.css";
import { auth } from "../firebase.config";
import { getUserRole } from "../admin/getUserRole";
import useGetData from "../custom-hooks/useGetData";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import Loading from './../components/Loading/Loading';

const UserDashboard = () => {
  const [isUser, setIsUser] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true); // Add loading state
  const navigate = useNavigate();
  const { data: orders } = useGetData("orders");
  // let tl = gsap.timeline();

  // tl.fromTo("col1", { x: -200 }, { duration: 1, x: 200 });
  // tl.fromTo("col2", { x: 100 }, { duration: 1, x: -100 });
  // tl.fromTo("col3", { y: -100 }, { duration: 1, y: 100 });

  // useEffect(() => {
  //   if (!loading) {
  //     const handleLoad = () => {
  //       const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5, yoyo: true })
  //       tl.fromTo("col1", { x: -200 }, {
  //         duration: 2,
  //         x: 200
  //       })
  //         .fromTo("col2", { x: 100 }, {
  //           duration: 2,
  //           x: -100
  //         })
  //         .fromTo("col3", { y: -100 }, {
  //           duration: 2,
  //           y: 100
  //         });
  //     };

  //     window.addEventListener("load", handleLoad);

  //     return () => {
  //       window.removeEventListener("load", handleLoad);
  //     }
  //   }

  // }, [loading]);

  useEffect(() => {
    if (!loading) {
      const tl = gsap.timeline({ repeat: 1, repeatDelay: 0.5 });

      tl.fromTo(".col1", { x: -200, opacity: 0 }, { duration: 1, x: 0, opacity: 1 })
        .fromTo(".col2", { x: 200, opacity: 0 }, { duration: 1, x: 0, opacity: 1 })
        .fromTo(".col3", { y: -50, opacity: 0 }, { duration: 1, y: 0, opacity: 1 });

      // You can also use window.onload if you want to ensure everything is loaded before running the animations
      window.onload = () => tl.play();

      return () => {
        // Clean up the timeline if the component unmounts
        tl.kill();
      };
    }
  }, [loading]);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const user = auth.currentUser;
        setIsSignedIn(!!user); // Check if the user is signed in
        if (user) {
          const userRole = await getUserRole(user.uid);
          setIsUser(userRole === "user");
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      } finally {
        setLoading(false); // Set loading to false after the check is done
      }
    };

    checkUserRole();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!isSignedIn) {
        navigate("/login");
      } else if (!isUser) {
        navigate("/newhome"); // Redirect to the home page for non-user users
      }
    }
  }, [isSignedIn, isUser, loading, navigate]);

  if (loading) {
    return <Loading /> // You can replace this with a spinner or any loading indicator
  }

  if (!isSignedIn || !isUser) {
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

  //Var to calc and determine the width of the progress bar

  const progress = (totalAmountSpent / 500000) * 100;

  // Get delivered orders to the user
  const deliveredOrders = userOrders.filter(
    (order) => order.status === "Delivered"
  );

  return (
    <section className="px-1">
      <div className="px-3">
        <div class="mb-6 h-1 w-full bg-neutral-200 dark:bg-neutral-600">
          <div
            className="h-1 bg-green-500 transition-all duration-300 ease-in-out max-w-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between">
          <span>{progress > 10 && progress <= 25
    ? "Idan"
    : progress > 25 && progress < 50
    ? "Agba Saver"
    : progress >= 50 && progress < 75
    ? "Thrift Chief"
    : ""}</span>

          <span>Legend</span>
        </div>
      </div>
      <Container className={`content-center`}>
        <Row className={`gap-2`}>
          <div className="flex p-2">
            <Col className="lg-3 relative top-20 col1">
              <div className="amountSpent__box order__box flex flex-col content-center justify-center text-center max-w-full">
                <div className="text-base">
                  <div className="flex w-full ">
                    <div className="w-2/5"></div>
                    <div className="w-3/5 h-10 rounded-bl border-white bg-white">
                    </div>
                  </div>
                  <h5 className="mt-2  text-sm">Total Amount Spent</h5>
                </div>
                <span className="text-green-600 text-5xl">
                  ₦{totalAmountSpent}
                </span>
              </div>
            </Col>
            <div className="h-full w-5"></div>
            <Col className="lg-3 relative top-20 col2">
              <div className="delivered-orders__box order__box flex flex-col content-center justify-center text-center max-w-full">
                <div className=" text-base">
                  <div className="flex w-full ">
                    <div className="w-3/5 h-10 rounded-br border-white bg-white "></div>
                    <div></div>
                  </div>
                  <h5 className="mt-2  text-sm">Delivered Orders</h5>
                </div>
                <span className="text-blue-600 text-5xl">
                  {deliveredOrders.length}
                </span>
              </div>
            </Col>
          </div>
          <Col className="lg-3 absolute w-1/2 translate-x-1/2 col3">
            <div className="bg-white rounded pb-6 px-3">
              <div className="order__box flex flex-col content-center justify-center text-center">
                <span className="text-orange-400 text-6xl mt-1">
                  {" "}
                  {userOrders.length}
                </span>
                <h5 className="mt-2 text-lg">Orders Made</h5>
              </div>
            </div>
          </Col>
        </Row>
        <Container className={`mt-24`}>
        <Col className={`top-80 w-full`}>
          <div className="flex flex-col content-center justify-center text-center order__box">
            <h5 className="mt-2 text-lg">Pending Orders</h5>
          </div>
        </Col>
        </Container>
      </Container>
    </section>
  );
};

export default UserDashboard;
