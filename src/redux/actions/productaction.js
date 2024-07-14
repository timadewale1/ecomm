import { db } from "../../firebase.config";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";

export const FETCH_PRODUCT_REQUEST = 'FETCH_PRODUCT_REQUEST';
export const FETCH_PRODUCT_SUCCESS = 'FETCH_PRODUCT_SUCCESS';
export const FETCH_PRODUCT_FAILURE = 'FETCH_PRODUCT_FAILURE';

export const fetchProductRequest = () => ({ type: FETCH_PRODUCT_REQUEST });
export const fetchProductSuccess = (product) => ({ type: FETCH_PRODUCT_SUCCESS, payload: product });
export const fetchProductFailure = (error) => ({ type: FETCH_PRODUCT_FAILURE, payload: error });

export const fetchProduct = (id) => async (dispatch) => {
  dispatch(fetchProductRequest());
  try {
    // Fetch all vendors to find the product
    const vendorsQuerySnapshot = await getDocs(collection(db, "vendors"));
    
    let productData = null;
    let foundVendorId = null;

    // Iterate over each vendor to find the product
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
