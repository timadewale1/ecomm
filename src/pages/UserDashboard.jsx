import React, { useState, useEffect, useRef } from "react";
import { Progress } from "reactstrap";
import { auth, db } from "../firebase.config";
import { doc, getDoc } from "firebase/firestore";
import { getUserRole } from "../admin/getUserRole";
import useGetData from "../custom-hooks/useGetData";
import { useNavigate } from "react-router-dom";
import Loading from "./../components/Loading/Loading";
import CircularProgress from "../components/CircularProgress/CircularBar";
import AmountSpentGraph from "../components/CircularProgress/Graph";
import { GoDotFill } from "react-icons/go";
import { FaAngleLeft, FaMoon, FaSun } from "react-icons/fa";
import { gsap } from "gsap";
import { IoMdContact } from "react-icons/io";
import { collection, getDocs } from "firebase/firestore";
import ReactStars from "react-rating-stars-component";
import RoundedStar from "../components/Roundedstar";

const UserDashboard = () => {
  const [isUser, setIsUser] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [profilePicture, setProfilePicture] = useState(null);
  const [username, setUsername] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const { data: orders } = useGetData("orders");

  const circleRef = useRef(null);
  const graphRef = useRef(null);
  const progressBarRef = useRef(null);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const user = auth.currentUser;
        setIsSignedIn(!!user);
        if (user) {
          const userRole = await getUserRole(user.uid);
          setIsUser(userRole === "user");

          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfilePicture(userData.photoURL);
            setUsername(userData.username);
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!isSignedIn) {
        navigate("/login");
      } else if (!isUser) {
        navigate("/newhome");
      }
    }
  }, [isSignedIn, isUser, loading, navigate]);

  useEffect(() => {
    if (!loading) {
      gsap.from(circleRef.current, {
        duration: 1.5,
        x: -200,
        opacity: 0,
        ease: "power3.out",
      });

      gsap.from(graphRef.current, {
        duration: 1.5,
        opacity: 0,
        y: 100,
        ease: "power3.out",
      });

      gsap.from(progressBarRef.current, {
        duration: 1.5,
        x: -200,
        opacity: 0,
        ease: "power3.out",
      });
    }
  }, [loading]);

  useEffect(() => {
    const fetchAverageRating = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const vendorsSnapshot = await getDocs(collection(db, "vendors"));
          let totalRatings = 0;
          let ratingsCount = 0;

          vendorsSnapshot.forEach((doc) => {
            const vendorData = doc.data();
            if (vendorData.ratedBy && vendorData.ratedBy[user.uid]) {
              totalRatings += vendorData.ratedBy[user.uid];
              ratingsCount += 1;
            }
          });

          const average = ratingsCount > 0 ? totalRatings / ratingsCount : 0;
          setAverageRating(average);
        }
      } catch (error) {
        console.error("Error fetching ratings:", error);
      }
    };

    fetchAverageRating();
  }, [loading]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good Morning";
    } else if (hour < 18) {
      return "Good Afternoon";
    } else {
      return "Good Evening";
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!isSignedIn || !isUser) {
    return null;
  }

  const userOrders = orders.filter((order) => order.userId === auth.currentUser.uid);

  const totalAmountSpent = userOrders.reduce(
    (total, order) => {
      const amount = order.totalAmount || 0;
      return total + amount;
    },
    0
  );

  const deliveredOrders = userOrders.filter(
    (order) => order.status === "Delivered"
  );

  const graphData = userOrders.map((order, index) => ({
    name: `Order ${index + 1}`,
    amount: order.totalAmount || 0,
  }));

  const deliveryProgress = userOrders.length > 0 ? (deliveredOrders.length / userOrders.length) * 100 : 0;

  console.log("User Orders:", userOrders);
  console.log("Total Amount Spent:", totalAmountSpent);
  console.log("Graph Data:", graphData);

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900"} pb-10`}>
      <div className={`sticky top-0 ${darkMode ? "bg-gray-900" : "bg-white"} z-10 p-2 h-20 flex justify-between items-center shadow-md w-full`}>
        <FaAngleLeft
          onClick={() => navigate("/profile")}
          className={`text-2xl cursor-pointer ${darkMode ? "text-white" : ""}`}
        />
        <h1 className={`text-xl font-bold ${darkMode ? "text-white" : ""}`}>Metrics</h1>
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-300">
                <IoMdContact className="text-3xl" />
              </div>
            )}
          </div>
          <button
            onClick={toggleDarkMode}
            className={`ml-4 text-xl cursor-pointer ${darkMode ? "text-white" : ""}`}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
        </div>
      </div>
      <div className="flex-grow p-3">
        <div className="mt-2">
          <h1 className="font-ubuntu text-2xl font-semibold">
            {getCurrentGreeting()}, {username}
          </h1>
        </div>
        <div className="flex justify-center mt-4 items-center flex-col">
          <div ref={circleRef}>
            <CircularProgress value={userOrders.length} maxValue={60} />
          </div>
          <div className="flex text-center font-lato items-center mt-2">
            <p className="text-customOrange dark:text-customYellow">
              *Reach higher order milestones to unlock coupons and badges.😊
            </p>
          </div>
        </div>
        <div className="mt-8" ref={graphRef}>
          <div className="flex items-center mb-4">
            <GoDotFill className="text-blue-500 mr-2" />
            <h2 className="text-xl text-start font-ubuntu font-bold">
              Expenses Graph
            </h2>
          </div>
          <p className="text-gray-400 dark:text-orange-700 translate-x-6 -translate-y-7 text-xs font-poppins font-normal">
            ₦{totalAmountSpent.toLocaleString()}
          </p>
          <div>
            <AmountSpentGraph data={graphData} />
          </div>
        </div>
        <div className="mt-8 relative" ref={progressBarRef}>
          <div className="flex items-center mb-4">
            <GoDotFill className="text-blue-500 mr-2" />
            <h2 className="text-xl text-start font-ubuntu font-bold">
              Orders Completed
            </h2>
          </div>
          <div className="relative w-full">
            <Progress value={deliveryProgress} className="mb-4" />
            <span
              className="absolute"
              style={{
                top: "-35px",
                left: `calc(${deliveryProgress}% - 5px)`,
                fontSize: "24px",
              }}
            >
              🏡
            </span>
          </div>
          <p className="text-gray-400 dark:text-white text-xs font-poppins font-normal">
            Delivered Orders: {deliveredOrders.length} / {userOrders.length}
          </p>
        </div>
        <div className="mt-8">
          <div className="flex items-center mb-4">
            <GoDotFill className="text-blue-500 mr-2" />
            <h2 className="text-xl text-start font-ubuntu font-bold">
              Average Rating
            </h2>
          </div>
          <div className="flex justify-center items-center">
            <ReactStars
              count={5}
              value={averageRating}
              size={50}
              activeColor="#ffd700"
              emptyIcon={<RoundedStar filled={false} />}
              filledIcon={<RoundedStar filled={true} />}
              edit={false}
            />
            <span className="ml-2 text-gray-400 dark:text-white text-sm font-poppins font-bold">
              ({averageRating.toFixed(2)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
