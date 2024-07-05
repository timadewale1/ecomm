import React, { useRef, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./header.css";
import logo from "../../assets/images/eco-logo.png";
import userIcon from "../../assets/images/user-icon.png";

import { Container, Row } from "reactstrap";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import useAuth from "../../custom-hooks/useAuth";
import { toast } from "react-toastify";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase.config";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { cartActions } from "../../redux/slices/cartSlice";
const nav__links = [
  {
    path: "home",
    display: "Home",
  },
  {
    path: "shop",
    display: "Shop",
  },
  {
    path: "cart",
    display: "Cart",
  },
  {
    path: "user-dashboard",
    display: "dashboard",
  },
];

const Header = () => {
  const totalQuantity = useSelector((state) => state.cart.totalQuantity);
  const profileActionRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const dispatch = useDispatch();
  const location = useLocation();

  const headerRef = useRef(null);
  const stickyHeaderFunc = () => {
    window.addEventListener("scroll", () => {
      if (
        document.body.scrollTop > 80 ||
        document.documentElement.scrollTop > 80
      ) {
        headerRef.current.classList.add("sticky__header");
      } else {
        headerRef.current.classList.remove("sticky__header");
      }
    });
  };

  const logout = () => {
    signOut(auth)
      .then(() => {
        toast.success("Logged out");

        dispatch(cartActions.resetCart());
        navigate("/home");
      })
      .catch((err) => {
        toast.error("err.message");
      });
  };

  useEffect(() => {
    stickyHeaderFunc();

    return () => window.removeEventListener("scroll", stickyHeaderFunc);
  });

  const menuToggle = () => menuRef.current.classList.toggle("active__menu");

  const navigateToCart = () => {
    navigate("/cart");
  };

  const [isProfileActionsOpen, setIsProfileActionsOpen] = useState(false);

  const toggleProfileActions = () => {
    setIsProfileActionsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileActionRef.current &&
        !profileActionRef.current.contains(event.target)
      ) {
        setIsProfileActionsOpen(false);
      }
    };

    window.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);
  return (
    <header className="header" ref={headerRef}>
      <Container>
        <Row>
          <div className="nav__wrapper">
            <div className="logo">
              <img src={logo} alt="logo" />
              <div>
                <h1>Adetmart</h1>
              </div>
            </div>

            <div className="navigation" ref={menuRef} onClick={menuToggle}>
              <ul className="menu">
                {nav__links.map((item, index) => (
                  <li className="nav__item" key={index}>
                    <NavLink
                      to={item.path}
                      className={(navClass) =>
                        navClass.isActive ? "nav__active" : ""
                      }
                    >
                      {item.display}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
            <div className="nav__icons">
              <motion.div whileTap={{ scale: 1.2 }}>
                <span className="fav__icon" onClick={toggleProfileActions}>
                  <i className="ri-shut-down-line"></i>
                </span>
              </motion.div>
              <div
                className={`profile__actions profile ${
                  isProfileActionsOpen ? "show__profileActions" : ""
                }`}
                ref={profileActionRef}
              >
                {currentUser ? (
                  <span onClick={logout}>Logout</span>
                ) : (
                  <div className="profile__actions d-flex align-items-center justify-content-center flex-column">
                    <Link
                      to={{
                        pathname: "/login",
                        state: { from: location.pathname },
                      }}
                    >
                      Log In
                    </Link>

                    <Link to="/signup">Signup</Link>
                  </div>
                )}
              </div>

              <motion.span className="cart__icon" onClick={navigateToCart}>
                <i class="ri-shopping-cart-fill"></i>
                <span className="badge">{totalQuantity}</span>
              </motion.span>
              <div className="profile">
                <motion.img
                  whileTap={{ scale: 1.2 }}
                  src={
                    currentUser ? currentUser.photoURL : userIcon || userIcon
                  }
                  alt=""
                />
              </div>
              <div className="mobile__menu">
                <span onClick={menuToggle}>
                  <i class="ri-menu-3-line"></i>
                </span>
              </div>
            </div>
          </div>
        </Row>
      </Container>
    </header>
  );
};

export default Header;
