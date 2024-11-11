import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config";

const OrderChart = () => {
  const [fulfilled, setFulfilled] = useState(0);
  const [unfulfilled, setUnfulfilled] = useState(0);
  const [incoming, setIncoming] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        let fulfilledCount = 0;
        let unfulfilledCount = 0;
        let incomingCount = 0;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const { progressStatus } = data;

          if (progressStatus === "Delivered") {
            fulfilledCount++;
          } else if (
            ["In Progress", "Shipped", "Pending"].includes(progressStatus)
          ) {
            unfulfilledCount++;
          }
        
        });

        setFulfilled(fulfilledCount);
        setUnfulfilled(unfulfilledCount);
        setIncoming(incomingCount);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, []);

  const data = {
    labels: ["Fulfilled", "Unfulfilled", "Incoming"],
    datasets: [
      {
        data: [fulfilled, unfulfilled, incoming],
        backgroundColor: ["#FF00A9", "#4CAF50", "#4CAF50"],
        hoverBackgroundColor: ["#FF4081", "#FF7043", "#66BB6A"],
      },
    ],
  };

  const options = {
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => `${tooltipItem.label}: ${tooltipItem.raw}`,
        },
      },
    },
  };

  return (
    <div className="relative w-48 h-48 mx-auto">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-sm font-semibold font-opensans text-black">Total Orders</p>
        <p className="text-2xl font-bold text-black font-opensans">
          {fulfilled + unfulfilled + incoming}
        </p>
      </div>
      <div className="flex justify-center mt-4 space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
          <span className="text-gray-600">Fulfilled ({fulfilled})</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
          <span className="text-gray-600">Unfulfilled ({unfulfilled})</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
          <span className="text-gray-600">Incoming ({incoming})</span>
        </div>
      </div>
    </div>
  );
};

export default OrderChart;
