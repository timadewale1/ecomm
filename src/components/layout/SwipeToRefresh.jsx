import Lottie from "lottie-react";
import { useState, useEffect } from "react";
import LoadState from "../../Animations/loadinganimation.json";

const SwipeToRefresh = () => {
  const [startY, setStartY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (window.scrollY > 0) return; // Only allow when at the top
      setStartY(e.touches[0].clientY);
      setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
      if (!isSwiping) return;
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY;

      if (distance > 0) {
        setPullDistance(Math.min(distance, 100)); // Limit pull distance
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance > 50) {
        window.location.reload(); // Full page reload when pulled far enough
      }
      setPullDistance(0); // Reset animation
      setIsSwiping(false);
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [startY, isSwiping, pullDistance]);

  return (
    <div
      className="fixed top-0 left-0 w-full flex justify-center items-center text-gray-500"
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: pullDistance === 0 ? "transform 0.3s ease-out" : "none",
        opacity: pullDistance > 10 ? 1 : 0,
        pointerEvents: pullDistance > 10 ? "auto" : "none",
      }}
    >
      <Lottie
                  className="w-10 h-10"
                  animationData={LoadState}
                  loop={true}
                  autoplay={true}
                />
    </div>
  );
};

export default SwipeToRefresh;
