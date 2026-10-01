import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";

const GUEST_DEVICE_KEY = "mythrift:guest-question-device:v1";

const randomId = (prefix) => {
  if (typeof window.crypto?.randomUUID === "function") {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 14)}`;
};

export const createClientQuestionId = () => randomId("question");

export const getGuestQuestionDeviceId = () => {
  try {
    const existing = localStorage.getItem(GUEST_DEVICE_KEY);
    if (existing) return existing;
    const next = randomId("guest-device");
    localStorage.setItem(GUEST_DEVICE_KEY, next);
    return next;
  } catch {
    return randomId("guest-device-session");
  }
};

export const createAuthenticatedProductQuestion = async (payload) => {
  const response = await httpsCallable(functions, "createProductQuestionV2")(
    payload,
  );
  return response?.data || {};
};

export const requestGuestProductQuestion = async (payload) => {
  const response = await httpsCallable(
    functions,
    "requestGuestProductQuestionV1",
  )(payload);
  return response?.data || {};
};

export const confirmGuestProductQuestion = async (payload) => {
  const response = await httpsCallable(
    functions,
    "confirmGuestProductQuestionV1",
  )(payload);
  return response?.data || {};
};
