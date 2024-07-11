import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config";

const useFetchVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "vendors"));
        const vendorsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVendors(vendorsList);
      } catch (error) {
        console.error("Error fetching vendors: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  return { vendors, loading };
};

export default useFetchVendors;
