const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.deleteVendorData = functions.auth.user().onDelete(async (user) => {
  const userId = user.uid;
  const db = admin.firestore();

  try {
    // Delete vendor data from the "vendors" collection
    const vendorDoc = db.collection("vendors").doc(userId);
    await vendorDoc.delete();

    console.log(`Successfully deleted vendor data for user ID: ${userId}`);
  } catch (error) {
    console.error(`Error deleting vendor data for user ID: ${userId}`, error);
  }
});
