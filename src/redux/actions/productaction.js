import { db } from "../../firebase.config";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";

export const FETCH_PRODUCT_REQUEST = 'FETCH_PRODUCT_REQUEST';
export const FETCH_PRODUCT_SUCCESS = 'FETCH_PRODUCT_SUCCESS';
export const FETCH_PRODUCT_FAILURE = 'FETCH_PRODUCT_FAILURE';
export const FETCH_PRODUCTS_SUCCESS = 'FETCH_PRODUCTS_SUCCESS';
export const FETCH_PRODUCTS_REQUEST = 'FETCH_PRODUCTS_REQUEST';
export const FETCH_PRODUCTS_FAILURE = 'FETCH_PRODUCTS_FAILURE';

export const fetchProductRequest = () => ({ type: FETCH_PRODUCT_REQUEST });
export const fetchProductSuccess = (product) => ({ type: FETCH_PRODUCT_SUCCESS, payload: product });
export const fetchProductFailure = (error) => ({ type: FETCH_PRODUCT_FAILURE, payload: error });
export const fetchProductsSuccess = (products) => ({ type: FETCH_PRODUCTS_SUCCESS, payload: products });
export const fetchProductsRequest = () => ({ type: FETCH_PRODUCTS_REQUEST });
export const fetchProductsFailure = (error) => ({ type: FETCH_PRODUCTS_FAILURE, payload: error });

// Updated fetchProduct to fetch from the centralized 'products' collection
export const fetchProduct = (id) => async (dispatch) => {
  dispatch(fetchProductRequest()); // Dispatching initial request action
  try {
    const productRef = doc(db, "products", id); // Fetch from centralized products collection
    const productDoc = await getDoc(productRef); // Fetch the product

    if (productDoc.exists()) {
      const productData = productDoc.data();
      dispatch(fetchProductSuccess({ id: productDoc.id, ...productData })); // Dispatch success with product data
    } else {
      dispatch(fetchProductFailure("No such product found!"));
      toast.error("No such product found!");
    }
  } catch (error) {
    dispatch(fetchProductFailure(error.message)); // Dispatch failure on error
    toast.error("Error fetching product data: " + error.message);
  }
};

// Updated fetchProducts to fetch all products from the centralized 'products' collection
export const fetchProducts = () => async (dispatch) => {
  dispatch(fetchProductsRequest()); // Dispatch request action

  try {
    const productsSnapshot = await getDocs(collection(db, "products")); // Fetch all products from the centralized collection

    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    dispatch(fetchProductsSuccess(products)); // Dispatch success action with products
  } catch (error) {
    console.error("Error fetching products: ", error);
    dispatch(fetchProductsFailure(error.message)); // Dispatch failure on error
  }
};
