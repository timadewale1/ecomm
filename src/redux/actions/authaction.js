import { auth, db } from "../../firebase.config";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import {
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
  LOGOUT,
} from "./authActiontypes"

export const loginRequest = () => ({
  type: LOGIN_REQUEST,
});

export const loginSuccess = (user) => ({
  type: LOGIN_SUCCESS,
  payload: user,
});

export const loginFailure = (error) => ({
  type: LOGIN_FAILURE,
  payload: error,
});

export const logoutSuccess = () => ({
  type: LOGOUT,
});

export const login = (email, password) => async (dispatch) => {
  dispatch(loginRequest());
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    dispatch(loginSuccess({ ...user, displayName: userData.displayName }));
    console.log("Login successful:", user);
  } catch (error) {
    dispatch(loginFailure(error.message));
    console.error("Login error:", error);
  }
};

export const logout = () => async (dispatch) => {
  try {
    await signOut(auth);
    dispatch(logoutSuccess());
    console.log("Logout successful");
  } catch (error) {
    console.error("Logout error:", error);
  }
};
