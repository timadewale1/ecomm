// import Lottie from "lottie-react";
// import { useState, useEffect } from "react";
// import LoadState from "../../Animations/loadinganimation.json";

// const SwipeToRefresh = () => {
//   const [startY, setStartY] = useState(0);
//   const [isSwiping, setIsSwiping] = useState(false);
//   const [pullDistance, setPullDistance] = useState(0);
//   const [showPullText, setShowPullText] = useState(false); // New state for pull text visibility
//   const [isRefreshing, setIsRefreshing] = useState(false);


//   useEffect(() => {
//     const handleTouchStart = (e) => {
//       if (window.scrollY > 0) return; // Only allow when at the top
//       setStartY(e.touches[0].clientY);
//       setIsSwiping(true);
//     };

//     const isPwa = window.matchMedia("(display-mode: standalone)").matches;

//     if (!isPwa) return; // Disable on non-PWA

//     const handleTouchMove = (e) => {
//       // If the user has scrolled away from the top, cancel the swipe
//       if (window.scrollY > 5) {
//         setIsSwiping(false);
//         setPullDistance(0);
//         return;
//       }
//       const currentY = e.touches[0].clientY;
//       const distance = currentY - startY;
//       if (distance > 0) {
//         setPullDistance(Math.min(distance, 150)); // Limit pull distance
//       }
//       // Show text only between 20px and 60px
//       if (pullDistance>0) {
//         setShowPullText(true);
//       } else {
//         setShowPullText(false);
//       }
//     };

//     const handleTouchEnd = () => {
//       if (pullDistance > 130) {
//         // Lock the loader on screen
//         setIsRefreshing(true);
//         // Optionally, delay the reload a moment so the user sees the loader
//         setTimeout(() => {
//           window.location.reload();
//         }, 300);
//       } else {
//         setPullDistance(0);
//       }
//       setIsSwiping(false);
//       setShowPullText(false);
//     };

//     document.addEventListener("touchstart", handleTouchStart);
//     document.addEventListener("touchmove", handleTouchMove);
//     document.addEventListener("touchend", handleTouchEnd);

//     return () => {
//       document.removeEventListener("touchstart", handleTouchStart);
//       document.removeEventListener("touchmove", handleTouchMove);
//       document.removeEventListener("touchend", handleTouchEnd);
//     };
//   }, [startY, isSwiping, pullDistance]);

//    // Disable on non-PWA

//   return (
//     <>
//       {/* Pull to refresh text (placed outside root div for better visibility control) */}
//       <p
//         className="fixed top-5 left-1/2 transform -translate-x-1/2 text-sm text-center text-sky-600  rounded-lg z-[9999]"
//         style={{
//           opacity: showPullText ? 1 : 0,
//           transition: pullDistance === 0 ? "opacity 0.2s ease-in-out" : "none",
//           pointerEvents: "none",
//         }}
//       >
//         Pull down to refresh
//       </p>

//       {/* Refresh animation container */}
//       <div
//         className="fixed top-0 left-0 w-full flex flex-col justify-center items-center text-gray-500 z-[9999]"
//         style={{
//           transform: isRefreshing ? "translateY(0)" : `translateY(${pullDistance}px)`,
//           // When not refreshing, animate back when pullDistance resets
//           transition: pullDistance === 0 ? "transform 0.3s ease-out" : "none",
//           // Keep opacity at 1 when refreshing, otherwise based on pullDistance threshold
//           opacity: isRefreshing || pullDistance > 90 ? 1 : 0,
//           pointerEvents: isRefreshing ? "auto" : "none",
//         }}
//       >
//         <div className="flex flex-col items-center p-2 bg-customGrey rounded-full shadow-md">
//           <Lottie
//             className="w-10 h-10"
//             animationData={LoadState}
//             loop={true}
//             autoplay={true}
//           />
//         </div>
//       </div>
//     </>
//   );
// };

// export default SwipeToRefresh;
