import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {AlertCircle, CheckCircle2, Loader2, MailCheck} from "lucide-react";
import {useNavigate, useSearchParams} from "react-router-dom";
import SEO from "../../components/Helmet/SEO";
import {appHaptics} from "../../services/haptics";
import {confirmGuestProductQuestion} from "../../services/productQuestions";

const friendlyError = (error) => {
  const message = String(error?.message || "");
  if (/limit|three guest questions/i.test(message)) {
    return "You have used your three guest questions. Create an account to continue chatting with vendors.";
  }
  if (/expired|invalid|verification/i.test(message)) {
    return "This verification link is invalid or has expired.";
  }
  return "We couldn’t verify this question right now. Please try again.";
};

export default function VerifyProductQuestion() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCredentials = useMemo(
    () => ({
      requestId: searchParams.get("request") || "",
      token: searchParams.get("token") || "",
    }),
    [searchParams],
  );
  const startedRef = useRef(false);
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  const verify = useCallback(async () => {
    if (!initialCredentials.requestId || !initialCredentials.token) {
      setStatus("error");
      setMessage("This verification link is incomplete or invalid.");
      return;
    }
    setStatus("verifying");
    setMessage("");
    try {
      const response = await confirmGuestProductQuestion(initialCredentials);
      setResult(response);
      setStatus("success");
      void appHaptics.success();
    } catch (error) {
      setStatus("error");
      setMessage(friendlyError(error));
      void appHaptics.error();
    }
  }, [initialCredentials]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    // Keep the one-use token out of the visible address after this page has
    // captured it. This does not trigger a route transition or a second call.
    if (initialCredentials.requestId || initialCredentials.token) {
      window.history.replaceState(window.history.state, "", "/verify-question");
    }
    void verify();
  }, [initialCredentials, verify]);

  const success = status === "success";
  const failed = status === "error";

  return (
    <main className="min-h-[100dvh] bg-white px-5 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))] font-satoshi">
      <SEO
        title="Verify product question - My Thrift"
        url="https://www.shopmythrift.store/verify-question"
      />
      <section className="mx-auto flex min-h-[75dvh] w-full max-w-md flex-col items-center justify-center text-center">
        <span
          className={`mb-5 grid h-20 w-20 place-items-center rounded-full ${
            success
              ? "bg-emerald-50 text-emerald-600"
              : failed
                ? "bg-rose-50 text-rose-600"
                : "bg-orange-50 text-customOrange"
          }`}
          aria-hidden="true"
        >
          {status === "verifying" ? (
            <Loader2 className="h-9 w-9 animate-spin" />
          ) : success ? (
            <CheckCircle2 className="h-10 w-10" />
          ) : (
            <AlertCircle className="h-10 w-10" />
          )}
        </span>

        <h1 className="text-2xl font-semibold text-gray-950">
          {status === "verifying"
            ? "Verifying your question"
            : success
              ? "Question sent"
              : "Question not verified"}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-gray-600" role={failed ? "alert" : undefined}>
          {status === "verifying"
            ? "Please wait while My Thrift securely confirms your email."
            : success
              ? "The vendor can now see your question. We’ll email their answer to you."
              : message}
        </p>

        {success && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-left text-xs leading-5 text-gray-600">
            <MailCheck className="h-5 w-5 flex-none text-customOrange" aria-hidden="true" />
            You can close this page. No account is needed to receive the answer.
          </div>
        )}

        <div className="mt-7 flex w-full flex-col gap-3">
          {failed && (
            <button
              type="button"
              onClick={verify}
              className="min-h-12 w-full rounded-xl bg-customOrange px-5 font-semibold text-white"
            >
              Try again
            </button>
          )}
          {success && result?.productId && (
            <button
              type="button"
              onClick={() => navigate(`/product/${result.productId}`, {replace: true})}
              className="min-h-12 w-full rounded-xl bg-customOrange px-5 font-semibold text-white"
            >
              View item
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate("/", {replace: true})}
            className="min-h-12 w-full rounded-xl border border-gray-200 bg-white px-5 font-semibold text-gray-900"
          >
            Continue shopping
          </button>
        </div>
      </section>
    </main>
  );
}
