import PaystackPop from "@paystack/inline-js";
import {recordOperationalEvent} from "./operationalEvents";
import {reportAppException} from "./crashReporting";

let activeTransaction = null;

const cleanAccessCode = (value) => String(value || "").trim();

/**
 * Resume a server-initialised Paystack transaction inside the app WebView.
 *
 * The callback is presentation-only: payment confirmation and order creation
 * remain authoritative on the backend/webhook. Only one inline transaction is
 * allowed at a time so repeated taps cannot open overlapping Paystack frames.
 */
export const resumePaystackTransaction = ({ accessCode }) => {
  const normalizedAccessCode = cleanAccessCode(accessCode);
  if (!normalizedAccessCode) {
    return Promise.reject(new Error("The secure payment session is missing."));
  }
  if (activeTransaction) return activeTransaction;
  recordOperationalEvent("checkout_opened",{screen:"paystack"});

  activeTransaction = new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      activeTransaction = null;
      if(callback===reject){recordOperationalEvent("checkout_error",{screen:"paystack",code:"paystack_popup_failed"});void reportAppException({code:"paystack_popup_failed"},"checkout");}
      else recordOperationalEvent(value.status === "success" ? "checkout_client_completed" : "checkout_cancelled",{screen:"paystack",reference:value.reference});
      callback(value);
    };

    try {
      const popup = new PaystackPop();
      popup.resumeTransaction(normalizedAccessCode, {
        onSuccess: (transaction) =>
          settle(resolve, {
            status: "success",
            reference: String(transaction?.reference || "").trim() || null,
          }),
        onCancel: () => settle(resolve, { status: "cancelled" }),
        onError: (error) =>
          settle(
            reject,
            new Error(
              error?.message || "We couldn’t open Paystack. Please try again."
            )
          ),
      });
    } catch (error) {
      settle(
        reject,
        new Error(error?.message || "We couldn’t open Paystack. Please try again.")
      );
    }
  });

  return activeTransaction;
};
