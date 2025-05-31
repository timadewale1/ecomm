// src/components/Chat/WithAnswerModal.jsx
import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../custom-hooks/useAuth"; // or however you get currentUser 
import { db } from "../../firebase.config";
import AnswerModz from "./AnswerModz";
const WithAnswerModal = ({ children }) => {
  const { currentUser } = useAuth(); // assumes your hook returns { currentUser }
  const [showModal, setShowModal] = useState(false);
  const [inquiryData, setInquiryData] = useState(null);  // the Firestore data object
  const [inquiryId, setInquiryId] = useState(null);      // the document ID

  useEffect(() => {
    if (!currentUser) return;

    // 1) Listen for any "closed" inquiries where customerHasRead === false
    const inquiriesRef = collection(db, "inquiries");
    const q = query(
      inquiriesRef,
      where("customerId", "==", currentUser.uid),
      where("status", "==", "closed"),
      where("customerHasRead", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // no unread closed inquiries → hide modal
        setShowModal(false);
        setInquiryData(null);
        setInquiryId(null);
        return;
      }

      // Take the first matching doc
      const docSnap = snapshot.docs[0];
      const data = docSnap.data();
      const id = docSnap.id;

      // If we already have this open, do nothing
      if (inquiryId === id) return;

      // Otherwise, open a new one
      setInquiryId(id);
      setInquiryData(data);
      setShowModal(true);
    });

    return () => unsubscribe();
  }, [currentUser, inquiryId]);

  const handleCloseModal = async () => {
    // When user closes the “Answered Question” modal, we simply hide it.
    // Note: The actual `AnswerModal` component’s own useEffect will already mark
    // customerHasRead = true in Firestore. So by the time we get here, Firestore is updated.
    setShowModal(false);
    setInquiryData(null);
    setInquiryId(null);
  };

  return (
    <>
      {children}

      {inquiryData && (
        <AnswerModz
          isOpen={showModal}
          onClose={handleCloseModal}
          inquiryId={inquiryId}
          inquiryData={inquiryData}
        />
      )}
    </>
  );
};

export default WithAnswerModal;
