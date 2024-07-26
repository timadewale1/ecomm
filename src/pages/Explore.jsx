import React, { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchProducts } from "../redux/actions/productaction";
import Loading from "../components/Loading/Explorer";
import { addToCart } from "../redux/actions/action";
import { useFavorites } from "../components/Context/FavoritesContext"; // Ensure this path is correct
import TinderCard from "react-tinder-card";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { Link } from "react-router-dom";
import "../styles/explore.css";
import { toast } from "react-toastify";

const Explore = () => {
  const dispatch = useDispatch();
  const products = useSelector((state) => state.product.products);
  const loading = useSelector((state) => state.product.loading);
  const [currentIndex, setCurrentIndex] = useState(products.length - 1);
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [toastShown, setToastShown] = useState({
    cartError: false,
  });
  const [swipeDirection, setSwipeDirection] = useState(null);

  useEffect(() => {
    dispatch(fetchProducts()).catch((err) => {
      console.error("Failed to fetch products:", err);
      if (!toastShown.cartError) {
        toast.error("Failed to load products. Please try again.");
        setToastShown((prev) => ({ ...prev, cartError: true }));
      }
    });
  }, [dispatch, toastShown.cartError]);

  useEffect(() => {
    setCurrentIndex(products.length - 1);
  }, [products]);

  const swiped = (direction, product) => {
    setSwipeDirection(direction);
    if (direction === "right") {
      handleAddToCart(product);
    } else if (direction === "left") {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const outOfFrame = (name) => {
    console.log(`${name} left the screen!`);
    setSwipeDirection(null);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;

    // Check for valid source and destination
    if (source.droppableId === "products" && destination.droppableId === "cart") {
      handleAddToCart(products[source.index]);
    } else if (source.droppableId === "products" && destination.droppableId === "favorites") {
      const product = products[source.index];
      if (isFavorite(product.id)) {
        removeFavorite(product.id);
        toast.info(`Removed ${product.name} from favorites!`);
      } else {
        addFavorite(product);
        toast.success(`Added ${product.name} to favorites!`);
      }
    }
  };

  const handleAddToCart = useCallback((product) => {
    try {
      if (!product) {
        throw new Error("Product is undefined");
      }
      const productToAdd = {
        ...product,
        quantity: 1, // Default quantity
        mainImage: product.coverImageUrl // Ensure the mainImage is included
      };
      dispatch(addToCart(productToAdd));
      if (!toastShown.success) {
        toast.success(`Added ${product.name} to cart!`);
        setToastShown((prev) => ({ ...prev, success: true }));
      }
    } catch (err) {
      console.error("Failed to add to cart:", err);
      if (!toastShown.cartError) {
        toast.error("Failed to add product to cart. Please try again.");
        setToastShown((prev) => ({ ...prev, cartError: true }));
      }
    }
  }, [dispatch, toastShown]);

  const handleFavoriteToggle = (product, e) => {
    e.stopPropagation();
    if (isFavorite(product.id)) {
      removeFavorite(product.id);
      toast.info(`Removed ${product.name} from favorites!`);
    } else {
      addFavorite(product);
      toast.success(`Added ${product.name} to favorites!`);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-center mb-4">Explore Products</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="products" direction="horizontal">
          {(provided) => (
            <div
              className="card-container"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {products.length === 0 ? (
                <p className="text-red-700 text-center col-span-full">No products available</p>
              ) : (
                products.map((product, index) => (
                  <Draggable
                    key={product.id}
                    draggableId={product.id.toString()}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="relative"
                      >
                        <TinderCard
                          onSwipe={(dir) => swiped(dir, product)}
                          onCardLeftScreen={() => outOfFrame(product.name)}
                          preventSwipe={["up", "down"]}
                        >
                          <div
                            className={`card ${
                              index === currentIndex && swipeDirection
                                ? swipeDirection === "right"
                                  ? "swiping-right"
                                  : "swiping-left"
                                : ""
                            }`}
                            style={{ height: "100vh" }}
                          >
                            <div className="relative">
                              <img
                                src={product.coverImageUrl}
                                alt={product.name}
                                className="w-full h-48 object-cover rounded-md"
                              />
                              <button
                                onClick={(event) => handleFavoriteToggle(product, event)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-white shadow-md"
                              >
                                {isFavorite(product.id) ? (
                                  <AiFillHeart className="text-red-500 text-2xl" />
                                ) : (
                                  <AiOutlineHeart className="text-gray-500 text-2xl" />
                                )}
                              </button>
                            </div>
                            <Link to={`/product/${product.id}`} className="product-link">
                              <h3 className="text-xl font-semibold mt-7 cursor-pointer">
                                {product.name}
                              </h3>
                            </Link>
                            <p className="text-green-600 font-bold mt-2">₦{product.price}</p>
                          </div>
                        </TinderCard>
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default Explore;
