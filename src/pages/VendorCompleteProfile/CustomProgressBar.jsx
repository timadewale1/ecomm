import { ProgressBar, Step } from "react-step-progress-bar";
import "react-step-progress-bar/styles.css";

// ProgressBar component with custom styles
const CustomProgressBar = ({ percent }) => {
  return (
    <ProgressBar
      percent={percent}
      height={8} // Adjust the height of the bar
      filledBackground="transparent" // Set filled background to transparent so we handle it manually
      unfilledBackground="#f0f0f0" // The color for the unfilled sections
    >
      {/* Step 1 */}
      <Step transition="scale">
        {({ accomplished }) => (
          <div
            className={`transitionAll rounded-full  ${accomplished ? "bg-customOrange" : "bg-gray-300"}`}
            style={{
              width: "70px", // Control the width of each step
              height: "8px", // Height matches the progress bar height
              marginRight: "10px", // This adds spacing between steps
            }}
          />
        )}
      </Step>

      {/* Step 2 */}
      <Step transition="scale">
        {({ accomplished }) => (
          <div
            className={`transitionAll rounded-full  ${accomplished ? "bg-customOrange" : "bg-gray-300"}`}
            style={{
              width: "70px", // Control the width of each step
              height: "8px",
              marginRight: "10px", // Spacing between steps
            }}
          />
        )}
      </Step>

      {/* Step 3 */}
      <Step transition="scale">
        {({ accomplished }) => (
          <div
            className={`transitionAll rounded-full  ${accomplished ? "bg-customOrange" : "bg-gray-300"}`}
            style={{
              width: "70px",
              height: "8px",
              marginRight: "10px",
            }}
          />
        )}
      </Step>
          
        {/* Step 4 */}
        <Step transition="scale">
        {({ accomplished }) => (
          <div
            className={`transitionAll rounded
            -full  ${accomplished ? "bg-customOrange" : "bg-gray-300"}`}
            style={{
              width: "70px",
              height: "8px",
              marginRight: "10px",
            }}
            />
            )}
        </Step>

        {/* Step 5 */}
        <Step transition="scale">
        {({ accomplished }) => (
          <div
            className={`transitionAll rounded
            -full  ${accomplished ? "bg-customOrange" : "bg-gray-300"}`}
            style={{
              width: "70px",
              height: "8px",
              marginRight: "10px",
            }}
            />
            )}
        </Step>


    </ProgressBar>
  );
};

export default CustomProgressBar;
