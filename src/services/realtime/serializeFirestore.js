const isPlainObject = (value) => {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const firestoreValueToSerializable = (value) => {
  if (value == null) return value;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.map(firestoreValueToSerializable);
  if (typeof value?.latitude === "number" && typeof value?.longitude === "number") {
    return { latitude: value.latitude, longitude: value.longitude };
  }
  if (typeof value?.path === "string" && !isPlainObject(value)) {
    return { path: value.path };
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        firestoreValueToSerializable(nested),
      ]),
    );
  }
  return value;
};

export const snapshotDocument = (documentSnapshot) => ({
  id: documentSnapshot.id,
  ...firestoreValueToSerializable(documentSnapshot.data()),
});

export const snapshotChanges = (snapshot) =>
  snapshot.docChanges().map((change) => ({
    type: change.type,
    id: change.doc.id,
    data: snapshotDocument(change.doc),
  }));

