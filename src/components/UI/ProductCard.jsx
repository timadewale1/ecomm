import React from "react";
import { motion } from "framer-motion";
import "../../styles/product-card.css";
import { Col } from "reactstrap";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { cartActions } from "../../redux/slices/cartSlice";
import { toast } from "react-toastify";
import { auth } from "../../firebase.config";
const Productcard = ({ item }) => {
  const dispatch = useDispatch();
  const user = auth.currentUser;
  const userId = user ? user.uid : null; // Get the user ID or null if not authenticated

  const addToCart = () => {
    if (!userId) {
      // User is not authenticated, handle accordingly
      toast.error("Please log in to add items to the cart");
      return;
    }

    dispatch(
      cartActions.addItem({
        userId,
        newItem: {
          id: item.id,
          productName: item.productName,
          price: item.price,
          imgUrl: item.imgUrl,
        },
      })
    );
    toast.success("Product added Successfully");
  };

  return (
    <Col lg="3" md="4" className="mb-2">
      <div className="product__item">
        <div className="prouct__img">
          <motion.img whileHover={{ scale: 0.9 }} src={item.imgUrl} alt="" />
        </div>
        <div className="p-2 product__info">
          <h3 className="product__name">
            <Link to={`/shop/${item.id}`}>{item.productName}</Link>
          </h3>
          <span>{item.category}</span>
          <span>{item.subcategory}</span>
        </div>
        <div className="product__card-bottom d-flex align-items-center justify-contents-between p-2">
          <span className="price">${item.price}</span>
          <motion.span whileTap={{ scale: 1.2 }} onClick={addToCart}>
            <i class="ri-add-line"></i>
          </motion.span>
        </div>
      </div>
    </Col>
  );
};

export default Productcard;
