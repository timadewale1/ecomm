import React from "react";
import Lottie from "lottie-react";
import FavHeart from '../../Animations/favorites.json';

const Faves = () => {
  return (
    <div className="flex justify-center items-center">
      <Lottie
        className="w-96 h-64"
        animationData={FavHeart}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default Faves;
