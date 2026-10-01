import { publicVendorsQuery } from "../../services/publicVendors";

import { useState, useEffect } from "react";
import { getDocs } from "firebase/firestore";

const useFetchVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const querySnapshot = await getDocs(publicVendorsQuery());
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
