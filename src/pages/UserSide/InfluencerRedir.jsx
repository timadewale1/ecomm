import React, { useEffect, useState } from "react";
import Loading from "./../../components/Loading/Loading";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config"; // adjust path to your firebase config

const InfluencerRedir = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const confirmExistence = async () => {
      try {
        // reference "influencers" collection
        const influencersRef = collection(db, "influencers");

        // query where name == id
        const q = query(influencersRef, where("name", "==", id));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          // influencer exists
          localStorage.setItem("referrer", id);
        }
      } catch (error) {
        console.error("Error checking influencer:", error);
      } finally {
        navigate("/signup");
        setLoading(false);
      }
    };

    confirmExistence();
  }, [id, navigate]);

  return <div>{loading && <Loading />}</div>;
};

export default InfluencerRedir;
