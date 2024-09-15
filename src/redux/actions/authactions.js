import { auth, db } from "../../firebase.config";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";

// Action Types
export const AUTH_LOADING = 'AUTH_LOADING';
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_FAILURE = 'LOGIN_FAILURE';
export const LOGOUT = 'LOGOUT';

// Action Creators
export const authLoading = () => ({
  type: AUTH_LOADING,
});

export const loginSuccess = (user) => ({
  type: LOGIN_SUCCESS,
  payload: user,
});

export const loginFailure = (error) => ({
  type: LOGIN_FAILURE,
  payload: error,
});

export const logoutAction = () => ({
  type: LOGOUT,
});

// Async Actions
export const loginUser = (email, password) => async (dispatch) => {
  dispatch(authLoading());
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if email is verified
    if (!user.emailVerified) {
      dispatch(loginFailure("Please verify your email before logging in."));
      toast.error("Please verify your email before logging in.", { className: "custom-toast" });
      return;
    }

    // Retrieve user data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    // Check if the user is a regular user
    if (userData?.role !== "user") {
      await signOut(auth);
      dispatch(loginFailure("This email is already used for a Vendor account!"));
      toast.error("This email is already used for a Vendor account!", { className: "custom-toast" });
      return;
    }

    dispatch(loginSuccess(user));
    toast.success(`Hello ${userData?.displayName || "User"}, welcome!`, { className: "custom-toast" });
  } catch (error) {
    dispatch(loginFailure(error.message));
    toast.error("Unable to login. Please check your credentials and try again.", { className: "custom-toast" });
  }
};

export const logoutUser = () => async (dispatch) => {
  try {
    await signOut(auth);
    dispatch(logoutAction());
    toast.success("Successfully logged out", { className: "custom-toast" });
  } catch (error) {
    toast.error("Error logging out", { className: "custom-toast" });
  }
};
export const resetUserData = () => {
  return {
    type: 'RESET_USER_DATA',
  };
};