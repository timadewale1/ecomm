import React from "react";
import {
  MdOutlinePendingActions,
  MdOutlineLocalShipping,
} from "react-icons/md";
import { FaBoxOpen, FaTimes } from "react-icons/fa";
import { TbTruckDelivery } from "react-icons/tb";

// All possible steps:
const ALL_STEPS = [
  { label: "Pending", value: "Pending", icon: <MdOutlinePendingActions /> },
  { label: "Accepted", value: "Accepted", icon: <FaBoxOpen /> },
  { label: "Shipped", value: "Shipped", icon: <TbTruckDelivery /> },
  { label: "Delivered", value: "Delivered", icon: <MdOutlineLocalShipping /> },
];

// Special steps if status = Declined (2-step flow)
const DECLINED_STEPS = [
  { label: "Pending", value: "Pending", icon: <MdOutlinePendingActions /> },
  { label: "Declined", value: "Declined", icon: <FaTimes /> },
];

// Decide which steps to render:
const getVisibleSteps = (status) => {
  if (status === "Declined") {
    // Only show "Pending" + "Declined"
    return DECLINED_STEPS;
  }
  // Otherwise, show the four standard steps
  return ALL_STEPS;
};

// Map status to an index in the visible steps array:
const getStepIndex = (visibleSteps, status) => {
  return visibleSteps.findIndex((step) => step.value === status);
};

const OrderStepper = ({ orderStatus }) => {
  const visibleSteps = getVisibleSteps(orderStatus);
  const activeStepIndex = getStepIndex(visibleSteps, orderStatus);

  return (
    // Horizontal scroll if needed
    <div className="overflow-x-auto w-full my-2">
      {/* Steps container */}
      <div className="flex items-center">
        {visibleSteps.map((step, index) => {
          const isActive = index <= activeStepIndex;
          const isLast = index === visibleSteps.length - 1;

          // If this step is Declined *and* it's active:
          const isDeclinedStep = step.value === "Declined" && isActive;

          // Base classes for the step container
          let containerClasses = `
            flex items-center space-x-1 px-2 py-1 rounded-full border-2 transition-colors
          `;

          if (isDeclinedStep) {
            // Special red fill for Declined
            containerClasses += " bg-red-600 border-red-600";
          } else if (isActive) {
            // Normal active steps => orange border, white background
            containerClasses += " border-customOrange bg-white";
          } else {
            // Inactive steps => gray border, gray background, lowered opacity
            containerClasses += " border-gray-300 bg-gray-100 opacity-30";
          }

          return (
            <div key={index} className="flex items-center">
              {/* Step Container */}
              <div className={containerClasses}>
                {/* Icon & Label: 
                    - If Declined & active => text-white
                    - If active & not Declined => text-black
                    - Otherwise => text-black but with opacity on container
                */}
                <div
                  className={`text-xs font-opensans ${
                    isDeclinedStep
                      ? "text-white"
                      : isActive
                      ? "text-customRichBrown" // Or "text-black"
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

              {/* Connector line (exclude on last step) */}
              {!isLast && (
                <div
                  className={`h-0.5 w-4 ${
                    // If we've reached or passed this step, line is orange
                    // If it's Declined, let's keep the line red
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
