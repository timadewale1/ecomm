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
  dispatch(fetchProductRequest());
  try {
    const vendorsQuerySnapshot = await getDocs(collection(db, "vendors"));
    
    let productData = null;
    let foundVendorId = null;

    for (const vendorDoc of vendorsQuerySnapshot.docs) {
      const vendorId = vendorDoc.id;
      const productRef = doc(db, "vendors", vendorId, "products", id);
      const productDoc = await getDoc(productRef);

      if (productDoc.exists()) {
        productData = { id: productDoc.id, vendorId, ...productDoc.data() };
        foundVendorId = vendorId;
        break;
      }
    }

    if (productData) {
      dispatch(fetchProductSuccess(productData));
    } else {
      dispatch(fetchProductFailure("No such product found!"));
      toast.error("No such product found!");
    }
  } catch (error) {
    dispatch(fetchProductFailure(error.message));
    toast.error("Error fetching product data: " + error.message);
  }
};

export const fetchProducts = () => async (dispatch) => {
  dispatch(fetchProductsRequest());
  console.log("Dispatching fetchProducts");

  try {
    const vendorsCollection = collection(db, "vendors");
    const vendorDocs = await getDocs(vendorsCollection);

    let products = [];
    for (const vendorDoc of vendorDocs.docs) {
      const productsCollection = collection(vendorDoc.ref, "products");
      const productDocs = await getDocs(productsCollection);
      
      for (const productDoc of productDocs.docs) {
        products.push({ id: productDoc.id, ...productDoc.data() });
      }
    }

    console.log("Products fetched: ", products);
    dispatch(fetchProductsSuccess(products));
  } catch (error) {
    console.error("Error fetching products: ", error);
    dispatch(fetchProductsFailure(error.message));
  }
};
