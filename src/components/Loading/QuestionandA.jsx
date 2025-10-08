import React from "react";
import Lottie from "lottie-react";
import QuestionnA from "../../Animations/qanda.json";

const QuestionandA = () => {
  return (
    <div className="relative">
     
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
