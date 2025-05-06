// userWriteHandler.js

import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase.config";

export const handleUserActionLimit = async (
  userId,
  actionType,
  userData = {},
  options = {}
) => {
  const {
    collectionName = "usage_metadata",
    writeLimit = 100,
    minuteLimit = 8,
    hourLimit = 40,
    dayLimit = 150,
  } = options;

  const currentTime = Date.now();
  const oneHourMs = 60 * 60 * 1000;
  const fiveMinutesMs = 5 * 60 * 1000;
  const twelveHoursMs = 12 * oneHourMs;
  const oneDayMs = 24 * oneHourMs; // 24 hours

  // Firestore document reference
  const metadataRef = doc(db, collectionName, userId);

  try {
    const metadataSnap = await getDoc(metadataRef);

    // Fields for the chosen action type (e.g. 'favorite')
    const minuteCountField = `${actionType}_minuteWriteCount`;
    const minuteResetField = `${actionType}_minuteResetTime`;
    const hourCountField = `${actionType}_hourWriteCount`;
    const hourResetField = `${actionType}_hourResetTime`;

    // NEW: day-level fields
    const dayCountField = `${actionType}_dayWriteCount`;
    const dayResetField = `${actionType}_dayResetTime`;

    if (!metadataSnap.exists()) {
      // Document does not exist -> Create a new one
      await setDoc(metadataRef, {
        writeCount: 1,
        resetTime: currentTime + oneHourMs,

        [minuteCountField]: 1,
        [minuteResetField]: currentTime + fiveMinutesMs,

        [hourCountField]: 1,
        [hourResetField]: currentTime + twelveHoursMs,

        // Initialize day-level counters
        [dayCountField]: 1,
        [dayResetField]: currentTime + oneDayMs,

        lastWrite: serverTimestamp(),
      });
    } else {
      // Document exists
      const metadata = metadataSnap.data();
      const missingFields = {};

      // Check universal fields
      if (!("resetTime" in metadata)) {
        missingFields.resetTime = currentTime + oneHourMs;
      }
      if (!("writeCount" in metadata)) {
        missingFields.writeCount = 0;
      }

      // Check minute/hour/day fields
      if (!(minuteCountField in metadata)) {
        missingFields[minuteCountField] = 0;
      }
      if (!(minuteResetField in metadata)) {
        missingFields[minuteResetField] = currentTime + fiveMinutesMs;
      }
      if (!(hourCountField in metadata)) {
        missingFields[hourCountField] = 0;
      }
      if (!(hourResetField in metadata)) {
        missingFields[hourResetField] = currentTime + twelveHoursMs;
      }

      // NEW: Day-level checks
      if (!(dayCountField in metadata)) {
        missingFields[dayCountField] = 0;
      }
      if (!(dayResetField in metadata)) {
        missingFields[dayResetField] = currentTime + oneDayMs;
      }

      // If we have missing fields, update them
      if (Object.keys(missingFields).length > 0) {
        await updateDoc(metadataRef, missingFields);
      }

      // Re-fetch metadata
      const updatedSnap = await getDoc(metadataRef);
      const updatedMetadata = updatedSnap.data();

      // ---------- Universal Write Limit ----------
      if (currentTime > updatedMetadata.resetTime) {
        // Reset universal writeCount
        await updateDoc(metadataRef, {
          writeCount: 1,
          resetTime: currentTime + oneHourMs,
          lastWrite: serverTimestamp(),
        });
      } else if (updatedMetadata.writeCount < writeLimit) {
        await updateDoc(metadataRef, {
          writeCount: increment(1),
          lastWrite: serverTimestamp(),
        });
      } else {
        throw new Error("Write limit reached. Try again later.");
      }

      // ---------- Minute-level limit ----------
      if (currentTime > updatedMetadata[minuteResetField]) {
        await updateDoc(metadataRef, {
          [minuteCountField]: 1,
          [minuteResetField]: currentTime + fiveMinutesMs,
          lastWrite: serverTimestamp(),
        });
      } else if (updatedMetadata[minuteCountField] < minuteLimit) {
        await updateDoc(metadataRef, {
          [minuteCountField]: increment(1),
          lastWrite: serverTimestamp(),
        });
      } else {
        throw new Error(`Minute limit reached. Please wait 5 minutes.`);
      }

      // ---------- Hour-level limit ----------
      if (currentTime > updatedMetadata[hourResetField]) {
        await updateDoc(metadataRef, {
          [hourCountField]: 1,
          [hourResetField]: currentTime + twelveHoursMs,
          lastWrite: serverTimestamp(),
        });
      } else if (updatedMetadata[hourCountField] < hourLimit) {
        await updateDoc(metadataRef, {
          [hourCountField]: increment(1),
          lastWrite: serverTimestamp(),
        });
      } else {
        throw new Error(`Hour limit reached. Please wait.`);
      }

      // ---------- Day-level limit (NEW) ----------
      if (currentTime > updatedMetadata[dayResetField]) {
        // Reset daily
        await updateDoc(metadataRef, {
          [dayCountField]: 1,
          [dayResetField]: currentTime + oneDayMs,
          lastWrite: serverTimestamp(),
        });
      } else if (updatedMetadata[dayCountField] < dayLimit) {
        await updateDoc(metadataRef, {
          [dayCountField]: increment(1),
          lastWrite: serverTimestamp(),
        });
      } else {
        throw new Error(`Daily limit reached. Please wait.`);
      }
    }

    // Optional: update main user data (not typically needed for favoriting)
    if (Object.keys(userData).length > 0) {
      const userDocRef = doc(db, "user_data", userId);
      await updateDoc(userDocRef, userData);
    }
  } catch (error) {
    console.error("Error during handleUserActionLimit:", error.message);
    throw new Error(error.message);
  }
};
