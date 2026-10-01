import React, { useEffect, useState } from "react";
import Loading from "./../../components/Loading/Loading";
import { useParams, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase.config";

const InfluencerRedir = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const confirmExistence = async () => {
      try {
        const response = await httpsCallable(functions, "checkInfluencerReferralV1")({name:id});
        if (active && response.data.exists) {
          // influencer exists
          localStorage.setItem("referrer", id);
        }
      } catch (error) {
        console.error("Error checking influencer:", error);
      } finally {
        if (active) {
          navigate("/signup");
          setLoading(false);
        }
      }
    };

    confirmExistence();
    return () => { active = false; };
  }, [id, navigate]);

  return <div>{loading && <Loading />}</div>;
};

export default InfluencerRedir;
