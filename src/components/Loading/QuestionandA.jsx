import React from "react";
import Lottie from "lottie-react";
import QuestionnA from "../../Animations/qanda.json";

const QuestionandA = () => {
  return (
    <div className="relative">
      {/* Beta flag in top-right corner */}
      <div className="absolute top-0 right-20 mt-1 mr-1 bg-customOrange text-white text-[10px] font-opensans uppercase px-1.5 py-0.5 rounded">
        Beta
      </div>

      <div className="flex w-full h-24 justify-center items-center">
        <Lottie
          className="w-full h-full"
          animationData={QuestionnA}
          loop={true}
          autoplay={true}
        />
      </div>
    </div>
  );
};

export default QuestionandA;
