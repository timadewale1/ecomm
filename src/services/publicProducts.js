import {collection, doc, documentId, getDoc, getDocs, limit, query, where} from "firebase/firestore";
import {auth, db} from "../firebase.config";

// Normal browsing never reads the vendor's private source document. A scoped
// owner query additionally supports previews of that vendor's own drafts.
export async function getProductForDetail(productId) {
  const publicSnapshot = await getDoc(doc(db, "publicProducts", productId));
  if (publicSnapshot.exists()) return publicSnapshot;
  const session = auth.currentUser;
  if (!session?.uid || session.isAnonymous) return publicSnapshot;
  const owned = await getDocs(query(collection(db, "products"),
    where("vendorId", "==", session.uid), where(documentId(), "==", productId), limit(1)));
  if (auth.currentUser !== session) return publicSnapshot;
  return owned.docs[0] || publicSnapshot;
}
