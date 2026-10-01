import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import {uploadPrivateImage} from "../services/privateMedia";
import { db } from "../firebase.config";
import toast from "react-hot-toast";
import { RotatingLines } from "react-loader-spinner";
import { useNavigate } from "react-router-dom";
import SEO from "../components/Helmet/SEO";
import AppPageHeader from "../components/layout/AppPageHeader";
import NativeImageInput from "../components/Inputs/NativeImageInput";

const SubmitFeedback = () => {
  const [feedbackType, setFeedbackType] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const auth = getAuth();

  useEffect(() => onAuthStateChanged(auth, user => {
    const signedIn = Boolean(user && !user.isAnonymous);
    setEmail(signedIn ? user.email || "" : "");
    setIsAuthenticated(signedIn);
    setAttachments([]);
  }), [auth]);

  const uploadAttachments = async (files, feedbackId, session) => {
    const images = [];
    for (const [slot, file] of files.entries()) {
      try {
        if (auth.currentUser !== session) throw new Error("Your account changed. Please try again.");
        images.push(await uploadPrivateImage(file, {kind: "feedback", entityId: feedbackId, slot}));
      } catch (error) {
        console.error("Error uploading attachment:", error);
        throw new Error("Failed to upload attachment.");
      }
    }
    return images;
  };

  const handleFeedbackSubmit = async () => {
    if (
      !feedbackType ||
      !feedbackText ||
      (!isAuthenticated && !email.trim())
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (
      !isAuthenticated &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      toast.error("Please provide a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (attachments.length && (!user || user.isAnonymous)) {
        toast.error("Please sign in to attach images, or send your feedback without an attachment.");
        return;
      }
      if (attachments.some(file => !['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 8 * 1024 * 1024)) {
        toast.error("Please attach JPG, PNG, WebP or GIF images under 8 MB.");
        return;
      }
      const feedbackId = `${user?.uid || "guest"}-${Date.now()}`;
      let uploadedAttachments = [];

      if (attachments.length > 0) {
        uploadedAttachments = await uploadAttachments(attachments, feedbackId, user);
      }
      if (auth.currentUser !== user) return;

      const feedbackDoc = {
        userId: user?.uid || "guest",
        email,
        feedbackType,
        feedbackText,
        attachments: uploadedAttachments,
        submittedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "feedbacks", feedbackId), feedbackDoc);

      toast.success("Feedback submitted successfully!");
      setFeedbackType("");
      setFeedbackText("");
      setAttachments([]);
      if (!isAuthenticated) setEmail("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && attachments.length < 3) {
      setAttachments((prev) => [...prev, file]);
      console.log(attachments);
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const navigate = useNavigate();

  return (
    <>
    <SEO 
        title={`Submit Feedback - My Thrift`} 
        description={`Submit your feedback to the My Thrift team!`} 
        url={`https://www.shopmythrift.store/send-us-feedback`} 
      />
    <div className="flex flex-col items-center bg-gray-50  pb-4 font-opensans text-gray-800">
      {/* Header */}
      <AppPageHeader title="Send Us Feedback" alignment="left" onBack={() => navigate(-1)} />

      {/* Content */}
      <div className="w-full max-w-3xl bg-white  px-2">
        <div className="bg-customOrange flex flex-col relative text-center p-10  rounded-md justify-center items-center h-32 mb-3">
          <div className="absolute top-0 right-0">
            <img src="./Vector.png" alt="" className="w-16 h-24" />
          </div>
          <div className="absolute bottom-0 left-0">
            <img src="./Vector2.png" alt="" className="w-16 h-16" />
          </div>
          <h1 className="text-3xl text-white font-bold mb-2">
            Submit Your Feedback
          </h1>
        </div>

        <div className="flex flex-col space-y-4">
          <label className="text-sm font-medium font-opensans text-gray-700">
            Whats the issue?
            <select
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
              className="w-full p-2 border focus:outline-customOrange border-gray-300 rounded mt-1"
            >
              <option value="">Select a type</option>
              <option value="Complaint">Complaint</option>
              <option value="Suggestion">Suggestion</option>
              <option value="General">General</option>
              <option value="Bug">Noticed a Bug</option>
              <option value="Payment">Payment Issues</option>
            </select>
          </label>

          <label className="text-sm font-medium text-gray-700">
            Explain better:
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full p-2 border focus:outline-customOrange border-gray-300 rounded mt-1 resize-none"
              rows="5"
              placeholder="Describe your feedback here..."
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Email Address:
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full p-2 border focus:outline-customOrange border-gray-300 rounded mt-1 ${
                isAuthenticated ? "bg-gray-200" : ""
              }`}
              readOnly={isAuthenticated}
              placeholder="Enter your email address"
            />
          </label>

          {/* Attachments */}
          <div className="text-sm">
            Attach up to 3 pictures or screenshots to help us better understand
            you (Optional):
          </div>
          {/* Attachments */}
          <div className="overflow-x-auto ">
            <div className="flex space-x-4">
              {attachments.map((file, index) => (
                <div key={index} className="relative w-36 h-36">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg border-2 border-dashed border-customOrange"
                  />
                  <button
                    onClick={() => handleRemoveAttachment(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs w-7 h-7"
                  >
                    &#8722;
                  </button>
                </div>
              ))}
              {attachments.length < 3 && (
                <label className="w-36 h-36 rounded-lg border-2 border-dashed border-customOrange flex items-center justify-center cursor-pointer">
                  <span className="text-customOrange">+</span>
                  <NativeImageInput
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleFeedbackSubmit}
            disabled={isSubmitting}
            className="w-full h-12 rounded-full bg-customOrange text-white font-medium text-sm hover:bg-customDeepOrange flex items-center justify-center"
          >
            {isSubmitting ? (
              <RotatingLines
                width="25"
                height="25"
                strokeColor="white"
                strokeWidth="4"
              />
            ) : (
              "Submit Feedback"
            )}
          </button>
        </div>
        <div className="my-3 text-center text-xs text-customOrange">
          ⓘ Your feedback helps us improve our service. Thank you for taking the
          time to share your thoughts with us.😁🧡
        </div>
      </div>
    </div>
    </>
  );
};

export default SubmitFeedback;
