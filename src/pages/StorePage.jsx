import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from "../firebase.config"; // Update with your actual Firebase config path
import { doc, getDoc } from "firebase/firestore";
import ReactStars  from 'react-rating-stars-component';
import RoundedStar from '../components/Roundedstar';

const StorePage = () => {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendor = async () => {
        try {
            const vendorRef = doc(db, "vendors",id);
            const vendorSnapshot = await getDoc(vendorRef);
            if (vendorSnapshot.exists()) {
              setVendor({ id: vendorSnapshot.id, ...vendorSnapshot.data() });
            } else {
              console.log("No such document!");
            }
          } catch (error) {
            console.error("Error fetching vendor:", error);
          } finally {
            setLoading(false);
          }
    };

    fetchVendor();
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!vendor) {
    return <div>No vendor found</div>;
  }

  return (
    <div>
      <h1>{vendor.shopName}</h1>
      <img src={vendor.coverImageUrl} alt={vendor.shopName} />
      <p>{vendor.description}</p>
      <div>
        {vendor.categories.map((category, index) => (
          <span key={index}>{category}</span>
        ))}
      </div>
      <div>
        <ReactStars
          count={5}
          value={vendor.rating || 0}
          size={24}
          activeColor="#ffd700"
          emptyIcon={<RoundedStar filled={false} />}
          filledIcon={<RoundedStar filled={true} />}
          edit={false}
        />
        <span>({vendor.ratingCount || 0} reviews)</span>
      </div>
      {/* Add more vendor details as needed */}
    </div>
  );
};

export default StorePage;
