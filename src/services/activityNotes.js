import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase.config";

const addActivityNote = async (vendorId, title, note, type = "order") => {
  try {
    const activityNotesRef = collection(db, "vendors", vendorId, "activityNotes");
    await addDoc(activityNotesRef, {
      title,
      note,
      type,
      timestamp: new Date(),
    });
    console.log("Activity note added successfully.");
  } catch (error) {
    console.error("Error adding activity note:", error);
  }
};

export default addActivityNote;
