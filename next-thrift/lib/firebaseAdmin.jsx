import fs from "fs";
import path from "path";
import admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccountPath = path.join(
    process.cwd(),
    "secrets",
    "serviceAccount.json"
  );
  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const dbAdmin = admin.firestore();
export { dbAdmin };
