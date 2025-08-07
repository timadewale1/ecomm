import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { LiaTimesSolid } from "react-icons/lia";
import { motion, AnimatePresence } from "framer-motion";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../../custom-hooks/useAuth";
import { Check } from "lucide-react";
import { generateCartHash } from "../../services/cartHash";
import { FaGift } from "react-icons/fa";
import Gift from "../Loading/Gift";
import { useSelector } from "react-redux";
import { calculateCartTotalForVendor } from "../../services/carthelper";
const TriviaGame = ({ onReward }) => {
  const { vendorId } = useParams();
  const { currentUser } = useAuth();
  const functions = getFunctions();
  const playTrivia = httpsCallable(functions, "playTrivia");

  const [question, setQuestion] = useState(null);
  const [nonceOrderValue, setNonceOrderValue] = useState(0);
  const [disclaimerShown, setDisclaimerShown] = useState(false);
  const [showTriviaCard, setShowTriviaCard] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [timer, setTimer] = useState(7);
  const [isGameActive, setIsGameActive] = useState(false);
  const [reward, setReward] = useState(null);
  const cart = useSelector((state) => state.cart);
  // load disclaimer flag from localStorage
  useEffect(() => {
    const shown = localStorage.getItem("triviaDisclaimerShown") === "true";
    setDisclaimerShown(shown);
  }, []);

  // question timer
  useEffect(() => {
    if (isGameActive && timer > 0) {
      const iv = setInterval(() => setTimer((p) => p - 1), 1000);
      return () => clearInterval(iv);
    }
    if (isGameActive && timer === 0) handleAnswerSubmit(null);
  }, [timer, isGameActive]);

  // 3-2-1 countdown
  useEffect(() => {
    if (!showCountdown) return;
    if (countdown > 0) {
      const iv = setInterval(() => setCountdown((p) => p - 1), 1000);
      return () => clearInterval(iv);
    }
    setShowCountdown(false);
    setIsGameActive(true);
    setTimer(7);
  }, [countdown, showCountdown]);

  const startGame = async () => {
    if (!disclaimerShown) {
      localStorage.setItem("triviaDisclaimerShown", "true");
      setDisclaimerShown(true);
    }

    try {
      // 1. Build cartItems array
      const vendorCart = cart[vendorId]?.products || {};
      const cartItems = Object.values(vendorCart).map((p) => {
        const item = { productId: p.id, quantity: p.quantity };
        if (p.subProductId) {
          item.subProductId = p.subProductId;
        } else if (p.selectedColor && p.selectedSize) {
          item.variantAttributes = {
            color: p.selectedColor,
            size: p.selectedSize,
          };
        }
        return item;
      });

      // 2. Compute current cart total for this vendor
      const orderValue = calculateCartTotalForVendor(cart, vendorId);
      setNonceOrderValue(orderValue);

      // 3. Generate the cart hash
      const cartHash = generateCartHash(cartItems);

      // 4. Fetch a new question from Cloud Function
      const { data } = await playTrivia({ vendorId, orderValue, cartHash });
      const { questionId, question: text, options } = data;

      // 5. Save question and kick off countdown
      setQuestion({ id: questionId, text, options });
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowTriviaCard(false);
      setShowCountdown(true);
      setCountdown(3);
    } catch (err) {
      toast.error(err.message || "Failed to load trivia question");
    }
  };

  const handleAnswerSubmit = async (ans) => {
    setIsGameActive(false);

    try {
      // 1. Rebuild cartItems in case cart changed
      const vendorCart = cart[vendorId]?.products || {};
      const cartItems = Object.values(vendorCart).map((p) => {
        const item = { productId: p.id, quantity: p.quantity };
        if (p.subProductId) {
          item.subProductId = p.subProductId;
        } else if (p.selectedColor && p.selectedSize) {
          item.variantAttributes = {
            color: p.selectedColor,
            size: p.selectedSize,
          };
        }
        return item;
      });

      // 2. Recompute cart total
      const orderValue = calculateCartTotalForVendor(cart, vendorId);

      // 3. Regenerate the cart hash
      const cartHash = generateCartHash(cartItems);

      // 4. Submit answer and receive reward info
      const { data } = await playTrivia({
        vendorId,
        questionId: question.id,
        answer: ans,
        orderValue,
        cartHash,
      });

      if (data.success) {
        setIsCorrect(true);
        setReward(data.reward);
        onReward?.();
      } else {
        setIsCorrect(false);
      }
    } catch (err) {
      toast.error(err.message || "Error submitting your answer");
    }
  };

  const closeGame = () => {
    setShowTriviaCard(false);
    setShowCountdown(false);
    setIsGameActive(false);
    setIsCorrect(null);
    setSelectedAnswer(null);
    setTimer(7);
    setCurrentQuestionIndex(0);
  };

  const getRewardMessage = (r) => {
    if (r.type.startsWith("DISCOUNT"))
      return `${r.discountPercent}% Off Your Order!`;
    if (r.type === "FREE_SHIPPING" || r.type === "FREE_DELIVERY")
      return "Free Delivery!";
    if (r.type === "NO_SERVICE_FEE") return "No Service Fee!";
    return "";
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
  };

  const numberVariants = {
    initial: { opacity: 0, scale: 0.5 },
    animate: {
      opacity: [0, 1, 1, 0],
      scale: [0.5, 1.5, 1.5, 0.5],
      transition: { duration: 1, times: [0, 0.2, 0.8, 1] },
    },
    exit: { opacity: 0, scale: 0.5, transition: { duration: 0.2 } },
  };

  return (
    <div className="mt-3">
      {!showTriviaCard &&
        !showCountdown &&
        !isGameActive &&
        !reward &&
        !isCorrect && (
          <img
            src="/quizimage.png"
            alt="Play Trivia"
            className="w-full h-16 active:scale-[0.98] active:ring-2 active:ring-orange-300 transition object-cover rounded-lg cursor-pointer"
            onClick={() =>
              disclaimerShown ? startGame() : setShowTriviaCard(true)
            }
            onError={(e) => (e.target.src = "https://via.placeholder.com/150")}
          />
        )}

      <AnimatePresence>
        {showTriviaCard && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
          >
            <motion.div
              className="bg-white w-[90%] max-w-md mx-auto p-6 rounded-lg shadow-lg relative"
              variants={modalVariants}
            >
              <LiaTimesSolid
                className="absolute top-4 right-4 text-xl cursor-pointer text-black"
                onClick={closeGame}
              />
              <h2 className="text-base font-opensans font-semibold mb-3 text-center">
                Trivia Time!
              </h2>
              <div className="max-w-md mx-auto p-4">
                <p className="text-sm font-satoshi mb-6 text-center text-gray-700 leading-relaxed">
                  Get ready for an exciting quiz challenge! Here's what you need
                  to know:
                </p>
                <div className="space-y-3 mb-4">
                  {[
                    "Questions are based on seasons 2019 to current",
                    "You have 7 seconds to answer each question",
                    "Answer correctly to win amazing rewards!",
                    "Heads up: The promo may not always show as applied here, but don't worry it'll reflect at the payment gateway.",
                  ].map((txt, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Check className="w-3 h-3 text-white flex-shrink-0" />
                      </div>
                      <p className="text-sm font-satoshi text-gray-700">
                        {txt}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
                  <p className="text-xs font-satoshi text-customOrange text-center">
                    💡 <strong>Quick tip:</strong> Timer may vary slightly based
                    on your device or internet connection
                  </p>
                </div>
              </div>
              <button
                onClick={startGame}
                className="w-full py-2.5 rounded-full bg-customOrange text-white font-opensans font-semibold"
              >
                Start Game
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCountdown && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
          >
            <motion.div
              key={countdown}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={numberVariants}
              className="text-white text-6xl font-bold"
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGameActive && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
          >
            <motion.div
              className="bg-white w-[90%]  h-[70%] max-w-md mx-auto p-6 rounded-lg shadow-lg relative"
              variants={modalVariants}
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-opensans font-semibold text-black">
                  Trivia Question
                </h2>
                <motion.div
                  key={timer}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={numberVariants}
                  className="text-customOrange font-satoshi font-semibold"
                >
                  {timer}s
                </motion.div>
              </div>
              {question && (
                <>
                  <p className="text-sm font-opensans mt-6 mb-4 text-center text-black">
                    {question.text}
                  </p>
                  <div className="space-y-3 mt-12">
                    {question.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedAnswer(opt);
                          handleAnswerSubmit(opt);
                        }}
                        className={`w-full py-2.5 rounded-lg text-sm font-opensans transition-colors ${
                          selectedAnswer === opt
                            ? "bg-customOrange text-white"
                            : "bg-gray-100 text-black hover:bg-gray-200"
                        }`}
                        disabled={!!selectedAnswer}
                      >
                        {opt}
                      </button>
                    ))}
                    <p className="text-[9px] px-4 translate-y-6 font-satoshi text-center text-gray-400 mb-4">
                      All questions are from the 2019 season till now; answers
                      are backed from Opta and other verified sources.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCorrect === false && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
          >
            <motion.div
              className="bg-white w-[90%] max-w-md mx-auto p-6 rounded-lg shadow-lg relative border-2 border-red-500"
              variants={modalVariants}
            >
              <LiaTimesSolid
                className="absolute top-4 right-4 text-xl cursor-pointer text-black"
                onClick={closeGame}
              />
              <h2 className="text-base font-opensans font-semibold mb-3 text-center text-red-600">
                Incorrect Answer
              </h2>
              <p className="text-sm font-opensans mb-4 text-center">
                Sorry, that's not correct. Try again next time!
              </p>
              <button
                onClick={closeGame}
                className="w-full py-2.5 rounded-full bg-customOrange text-white font-opensans font-semibold"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {reward && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-green-200 px-2 py-1 flex items-center gap-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
          {/* Icon Container */}
          <Gift className="w-6 h-6 text-white" />

          {/* Content Container */}
          <div className="flex-1">
            <h2 className="text-sm font-medium font-opensans text-gray-700 mb-1">
              🎉 Trivia Reward
            </h2>
            <p className="text-base font-semibold uppercase font-satoshi text-green-600">
              {getRewardMessage(reward)}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <div className="w-1 h-1 bg-green-300 rounded-full opacity-60"></div>
            <div className="w-1 h-1 bg-green-400 rounded-full opacity-80"></div>
            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TriviaGame;
