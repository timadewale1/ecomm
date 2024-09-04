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

export const fetchProduct = (id) => async (dispatch) => {
  dispatch(fetchProductRequest()); // Dispatching initial request action
  try {
    const vendorsQuerySnapshot = await getDocs(collection(db, "vendors")); // Get all vendor documents

    let productData = null;
    let foundVendorId = null;

    for (const vendorDoc of vendorsQuerySnapshot.docs) {
      const vendorId = vendorDoc.id; // Get the vendor ID
      const productRef = doc(db, "vendors", vendorId, "products", id); // Reference to product under each vendor
      const productDoc = await getDoc(productRef); // Fetch the product

      if (productDoc.exists()) {
        productData = { id: productDoc.id, vendorId, ...productDoc.data() }; // If product found, set data
        foundVendorId = vendorId;
        break; // Stop loop after finding the product
      }
    }

    if (productData) {
      dispatch(fetchProductSuccess(productData)); // Dispatch success with product data
    } else {
      dispatch(fetchProductFailure("No such product found!"));
      toast.error("No such product found!");
    }
  } catch (error) {
    dispatch(fetchProductFailure(error.message)); // Dispatch failure on error
    toast.error("Error fetching product data: " + error.message);
  }
};


export const fetchProducts = () => async (dispatch) => {
  dispatch(fetchProductsRequest()); // Dispatch request action
  console.log("Dispatching fetchProducts");

  try {
    const vendorsCollection = collection(db, "vendors");
    const vendorDocs = await getDocs(vendorsCollection); // Get all vendor documents

    let products = [];
    for (const vendorDoc of vendorDocs.docs) {
      const vendorId = vendorDoc.id; // Get the vendor ID
      const productsCollection = collection(vendorDoc.ref, "products"); // Reference to products subcollection
      const productDocs = await getDocs(productsCollection); // Fetch all products under this vendor
      
      for (const productDoc of productDocs.docs) {
        const productData = productDoc.data(); // Get product data
        products.push({
          id: productDoc.id,
          vendorId, // Attach vendorId to the product
          ...productData // Spread product data
        });
      }
    }

    console.log("Products fetched: ", products); // Log all fetched products
    dispatch(fetchProductsSuccess(products)); // Dispatch success action with products
  } catch (error) {
    console.error("Error fetching products: ", error);
    dispatch(fetchProductsFailure(error.message)); // Dispatch failure on error
  }
};

