import React from "react";
import {
  MdOutlinePendingActions,
  MdOutlineLocalShipping,
} from "react-icons/md";
import { FaBoxOpen, FaTimes } from "react-icons/fa";
import { TbTruckDelivery } from "react-icons/tb";
import { PiBasketFill } from "react-icons/pi";

// Common steps
const BASE_STEPS = [
  { label: "Pending", value: "Pending", icon: <MdOutlinePendingActions /> },
  { label: "Accepted", value: "In Progress", icon: <FaBoxOpen /> },
  { label: "Shipped", value: "Shipped", icon: <TbTruckDelivery /> },
  { label: "Delivered", value: "Delivered", icon: <MdOutlineLocalShipping /> },
];

// Extra step for stockpile
const PILING_STEP = {
  label: "Piling",
  value: "Piling",
  icon: <PiBasketFill />,
};

// Declined path
const DECLINED_STEPS = [
  { label: "Pending", value: "Pending", icon: <MdOutlinePendingActions /> },
  { label: "Declined", value: "Declined", icon: <FaTimes /> },
];

// 🔥 Determine which steps to show
const getVisibleSteps = (status, isStockpile) => {
  if (status === "Declined") return DECLINED_STEPS;

  if (
    isStockpile &&
    ["in progress", "piling", "shipped", "delivered"].includes(
      status?.toLowerCase()
    )
  ) {
    console.log(
      "👣 Stepper using steps for:",
      status,
      "stockpile?",
      isStockpile
    );

    // Insert "Piling" after "Accepted"
    return [
      ...BASE_STEPS.slice(0, 2), // Pending, Accepted
      PILING_STEP,
      ...BASE_STEPS.slice(2), // Shipped, Delivered
    ];
  }

  return BASE_STEPS;
};

const getStepIndex = (visibleSteps, status) =>
  visibleSteps.findIndex((step) => step.value === status);

const OrderStepper = ({ orderStatus, isStockpile }) => {
  console.log("💡 OrderStepper Props:", { orderStatus, isStockpile });

  const visibleSteps = getVisibleSteps(orderStatus, isStockpile);
  const activeStepIndex = getStepIndex(visibleSteps, orderStatus);

  return (
    <div className="overflow-x-auto w-full my-2">
      <div className="flex items-center">
        {visibleSteps.map((step, index) => {
          const isActive = index <= activeStepIndex;
          const isLast = index === visibleSteps.length - 1;
          const isDeclinedStep = step.value === "Declined" && isActive;

          let containerClasses = `
            flex items-center space-x-1 px-2 py-1 rounded-full border-2 transition-colors
          `;

          if (isDeclinedStep) {
            containerClasses += " bg-red-600 border-red-600";
          } else if (isActive) {
            containerClasses += " border-customOrange bg-white";
          } else {
            containerClasses += " border-gray-300 bg-gray-100 opacity-30";
          }

          return (
            <div key={index} className="flex items-center">
              <div className={containerClasses}>
                <div
                  className={`text-xs font-opensans ${
                    isDeclinedStep
                      ? "text-white"
                      : isActive
                      ? "text-customRichBrown"
                      : "text-black"
                  }`}
                >
                  {step.icon}
                </div>
                <span
                  className={`text-[9px] font-medium ${
                    isDeclinedStep
                      ? "text-white"
                      : isActive
                      ? "text-black"
                      : "text-black"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {!isLast && (
                <div
                  className={`h-0.5 w-4 ${
                    isDeclinedStep
                      ? "bg-red-600"
                      : isActive
                      ? "bg-customOrange"
                      : "bg-gray-300"
                  }`}
                ></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStepper;
