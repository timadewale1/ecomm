import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import TinderCard from "react-tinder-card";
// import { fetchProducts, addToCart } from "../redux/actions/action";
// import { toggleFavorite } from "../redux/actions/favouriteactions";
import Explorer from "../components/Loading/Explorer";
import "../styles/explore.css";

const Explore = () => {
//   const dispatch = useDispatch();
//   const products = useSelector((state) => state.cart.products || []); // Ensure products is an array
//   const loading = useSelector((state) => state.cart.loading);
//   const [currentIndex, setCurrentIndex] = useState(products.length - 1);

//   useEffect(() => {
//     dispatch(fetchProducts());
//   }, [dispatch]);

//   useEffect(() => {
//     setCurrentIndex(products.length - 1);
//   }, [products]);

//   const swiped = (direction, product) => {
//     console.log(`Swiped ${direction} on ${product.name}`);
//     if (direction === "right") {
//       dispatch(addToCart(product));
//       console.log(`Added ${product.name} to cart`);
//     } else if (direction === "left") {
//       dispatch(toggleFavorite(product.id));
//       console.log(`Added ${product.name} to favorites`);
//     }
//     setCurrentIndex((prev) => prev - 1);
//   };

//   const outOfFrame = (name) => {
//     console.log(`${name} left the screen!`);
//   };

//   if (loading) {
    return <Explorer />;
//   }

  return (
    <div className="explore-container">
      {/* <div className="card-container">
        {products.length === 0 ? (
          <p>No products available</p>
        ) : (
          products.map((product, index) => (
            <TinderCard
              key={product.id}
              onSwipe={(dir) => swiped(dir, product)}
              onCardLeftScreen={() => outOfFrame(product.name)}
              preventSwipe={["up", "down"]}
            >
              <div
                className={`card ${index === currentIndex ? "current-card" : ""}`}
                style={{ height: '100vh' }}
              >
                <img
                  src={product.coverImageUrl}
                  alt={product.name}
                  className="card-image"
                />
                <h3 className="card-title">{product.name}</h3>
                <p className="card-description">{product.description}</p>
                <p className="card-price">₦{product.price}</p>
              </div>
            </TinderCard>
          ))
        )}
      </div> */}
    </div>
  );
};

export default Explore;
