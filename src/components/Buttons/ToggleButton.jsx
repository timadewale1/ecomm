import React, { useState, useEffect } from 'react';
import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'; // Assuming you've initialized Firestore in a file called firebase.js
import { db } from '../../firebase.config';
import toast from 'react-hot-toast';

const ToggleButton = ({ itemId, initialIsOn, onColor = "bg-customOrange", offColor = "bg-gray-300", vendorId }) => {
  const [isOn, setIsOn] = useState(initialIsOn);

  // Real-time listener for keeping the toggle state in sync with the database
  useEffect(() => {
    const docRef = doc(db, 'products', itemId);
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setIsOn(doc.data().published); // Update the state with the database value
      }
    });

    return () => unsubscribe(); // Clean up listener on component unmount
  }, [itemId]);

  // Handle toggle with optimistic UI update and database update
  const handleToggle = async () => {
    const newToggleValue = !isOn;
    setIsOn(newToggleValue); // Optimistic UI update

    const docRef = doc(db, 'products', itemId);
    try {
      await updateDoc(docRef, { published: newToggleValue });
      toast.success(isOn ? "Product drafted successfully." : "Product published successfully.");

      isOn ? (
        await addActivityNote(
          "Drafted Product",
          `You've hidden ${docRef.data().name}! Customers can not see or order this product while it is still drafted.`,
          "Product Update"
        )
      ) : (
        await addActivityNote(
          "Published Product",
          `You've made ${docRef.data().name} a visible product in your store! This will be part of the first products customers see in your store.`,
          "Product Update"
        )
      )

    } catch (error) {
      console.error("Failed to update database", error);
      setIsOn(!newToggleValue); // Revert UI if database update fails
    }
  };

  const addActivityNote = async (title, note, type) => {
    try {
      const activityNotesRef = collection(
        db,
        "vendors",
        vendorId,
        "activityNotes"
      );
      await addDoc(activityNotesRef, {
        title,
        type,
        note,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error adding activity note: ", error);
      toast.error("Error adding activity note: " + error.message);
    }
  };


  return (
    <div
      className={`w-11 h-5 flex items-center rounded-full p-1 cursor-pointer ${
        isOn ? `${onColor} bg-opacity-5` : offColor
      } transition-colors duration-300 ease-in-out`}
      onClick={handleToggle}
    >
      <div
        className={`h-5 w-5 ${isOn ? onColor : "bg-white"} rounded-full shadow-md transform ${
          isOn ? 'translate-x-5' : ''
        } transition-transform duration-300 ease-in-out`}
      ></div>
    </div>
  );
};

export default ToggleButton;
