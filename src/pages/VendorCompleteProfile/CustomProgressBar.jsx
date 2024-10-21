import { ProgressBar, Step } from "react-step-progress-bar";
import "react-step-progress-bar/styles.css";

// Custom ProgressBar component with fixes
const CustomProgressBar = ({ percent }) => {
  return (
    <ProgressBar
      percent={percent}
      height={8} // Adjust the height of the bar
      filledBackground="#f9531e" // Orange background for filled section
      unfilledBackground="#f0f0f0" // Light grey for unfilled sections
    >
      {/* Step 1 */}
      <Step transition="scale">
        {({ accomplished }) => (
          <div
            className={`rounded-full ${
              accomplished ? "bg-customOrange" : "bg-gray-300"
            }`}
            style={{
              width: "40px", // Consistent width for each step
              height: "8px", // Height to match the progress bar
              marginRight: "5px", // Consistent spacing between steps
            }}
          />
        )}
      </Step>

      {/* Step 2 */}
      <Step transition="scale">
        {({ accomplished }) => (
          <div
            className={`rounded-full ${
              accomplished ? "bg-customOrange" : "bg-gray-300"
            }`}
            style={{
              width: "40px", // Consistent width for each step
              height: "8px",
              marginRight: "5px",
            }}
          />
        )}
      </Step>

      {/* Step 3 */}
      <Step transition="scale">
        {({ accomplished }) => (
          <div
            className={`rounded-full ${
              accomplished ? "bg-customOrange" : "bg-gray-300"
            }`}
            style={{
              width: "40px", // Consistent width for each step
              height: "8px",
              marginRight: "5px",
            }}
          />
        )}
      </Step>

      {/* Step 4 */}
      <Step transition="scale">
        {({ accomplished }) => (
          <div
            className={`rounded-full ${
              accomplished ? "bg-customOrange" : "bg-gray-300"
            }`}
            style={{
              width: "40px", // Consistent width for each step
              height: "8px",
              marginRight: "5px",
            }}
          />
        )}
      </Step>

      {/* Step 5 */}
      <Step transition="scale">
        {({ accomplished }) => (
          <div
            className={`rounded-full ${
              accomplished ? "bg-customOrange" : "bg-gray-300"
            }`}
            style={{
              width: "40px", // Consistent width for each step
              height: "8px",
              marginRight: "5px",
            }}
          />
        )}
      </Step>
    </ProgressBar>
  );
};

export default CustomProgressBar;
