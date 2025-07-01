// OrderStepper.jsx
import React from "react";
import {
  MdOutlinePendingActions,
  MdOutlineLocalShipping,
} from "react-icons/md";
import { FaBoxOpen, FaTimes } from "react-icons/fa";
import { TbTruckDelivery } from "react-icons/tb";
import { PiBasketFill } from "react-icons/pi";
import { IoTimeOutline } from "react-icons/io5";

const PILING_STEP = {
  label: "Piling",
  value: "Piling",
  icon: <PiBasketFill />,
};

const DECLINED_STEPS = [
  { label: "Pending", value: "Pending", icon: <MdOutlinePendingActions /> },
  { label: "Declined", value: "Declined", icon: <FaTimes /> },
];

const OrderStepper = ({ orderStatus, isStockpile, isPickup }) => {
  /* 👇 build the base steps *after* we know isPickup */
  const BASE_STEPS = [
    { label: "Pending", value: "Pending", icon: <MdOutlinePendingActions /> },
    { label: "Accepted", value: "In Progress", icon: <FaBoxOpen /> },
    {
      label: isPickup ? "Scheduled" : "Shipped",
      value: "Shipped",
      icon: isPickup ? <IoTimeOutline /> : <TbTruckDelivery />,
    },
    {
      label: "Delivered",
      value: "Delivered",
      icon: <MdOutlineLocalShipping />,
    },
  ];

  /* ---------- pick the right list ---------- */
  let visibleSteps = BASE_STEPS;

  if (orderStatus === "Declined") {
    visibleSteps = DECLINED_STEPS;
  } else if (
    isStockpile &&
    ["in progress", "piling", "shipped", "delivered"].includes(
      orderStatus?.toLowerCase()
    )
  ) {
    visibleSteps = [
      ...BASE_STEPS.slice(0, 2), // Pending, Accepted
      PILING_STEP,
      ...BASE_STEPS.slice(2), // Scheduled/Shipped, Delivered
    ];
  }

  const activeStepIndex = visibleSteps.findIndex(
    (s) => s.value === orderStatus
  );

  /* ---------- render ---------- */
  return (
    <div className="overflow-x-auto w-full my-2">
      <div className="flex items-center">
        {visibleSteps.map((step, idx) => {
          const isActive = idx <= activeStepIndex;
          const isLast = idx === visibleSteps.length - 1;
          const isDecl = step.value === "Declined" && isActive;

          const boxStyles = `
            flex items-center space-x-1 px-2 py-1 rounded-full border-2
            ${
              isDecl
                ? "bg-red-600 border-red-600"
                : isActive
                ? "border-customOrange bg-white"
                : "border-gray-300 bg-gray-100 opacity-30"
            }
          `;

          return (
            <div key={idx} className="flex items-center">
              <div className={boxStyles}>
                <span
                  className={
                    isDecl
                      ? "text-white"
                      : isActive
                      ? "text-customRichBrown"
                      : "text-black"
                  }
                >
                  {step.icon}
                </span>
                <span
                  className={`text-[9px] font-medium ${
                    isDecl ? "text-white" : "text-black"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {!isLast && (
                <div
                  className={`h-0.5 w-4 ${
                    isDecl
                      ? "bg-red-600"
                      : isActive
                      ? "bg-customOrange"
                      : "bg-gray-300"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStepper;
