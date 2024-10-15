import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "react-toastify";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase.config";
import { motion } from "framer-motion";
import OtpInput from "otp-input-react";
import { CgSpinner } from "react-icons/cg";
import { BsFillShieldLockFill } from "react-icons/bs";
import "./Styles/otppage.css";
import { FaAngleLeft } from "react-icons/fa";

const VerifyOtp = ({ vendorData, confirmationResult, setSent, sent }) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [bloading, setBLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setBLoading(true);
    console.log("vD:", vendorData, "cR:", confirmationResult);

    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      const timestamp = new Date();

      await setDoc(doc(db, "vendors", user.uid), {
        uid: user.uid,
        firstName: vendorData.firstName,
        lastName: vendorData.lastName,
        phoneNumber: vendorData.phoneNumber,
        role: "vendor",
        profileComplete: false,
        createdSince: timestamp,
        lastUpdate: timestamp,
        isApproved: false,
      });

      toast.success("Account verified and created successfully!");
      navigate("/complete-profile");
    } catch (error) {
      toast.error("Invalid OTP: " + error.message);
      console.log("error: ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="font-opensans">
      <div className="container">
        <FaAngleLeft
          className="text-3xl -translate-y-2 font-extralight text-gray-500"
          onClick={() => {
            setSent(!sent);
          }}
        />
        <label
          htmlFor="otp"
          className="form-label text-customBrown  font-extrabold text-2xl mt-4"
        >
          Enter OTP Code
        </label>
        <p className="font-normal text-sm mb-4">
          A code that was sent to +234{vendorData.phoneNumber}
        </p>
        <form className="flex flex-col items-center justify-center space-y-96">
          <OtpInput
            value={otp}
            otpType="number"
            disabled={loading}
            onChange={setOtp}
            OTPLength={6}
            separator={<span>-</span>}
            autoFocus
            className="flex otp-container justify-center items-center ml-3"
          />
          <motion.button
            whileTap={otp && { scale: 1.2 }}
            type="submit"
            className={`bg-customOrange h-14 rounded-full text-white w-full ${
              !otp && otp.length !== 6 && "bg-customOrange opacity-30"
            } `}
            disabled={!otp}
            onClick={handleVerifyOtp}
          >
            {bloading ? (
              <div className="flex items-center justify-center">
                <CgSpinner
                  className="animate-spin mr-2"
                  size={20}
                  color="white"
                />
                <p>Verifying...</p>
              </div>
            ) : (
              "Verify OTP"
            )}
          </motion.button>
        </form>
      </div>
    </section>
  );
};

export default VerifyOtp;
