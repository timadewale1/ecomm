import React, { useState } from "react";
import { FaAngleRight } from "react-icons/fa";
import { LiaTimesSolid } from "react-icons/lia";
import { GoChevronLeft } from "react-icons/go";
import ScrollToTop from "../../components/layout/ScrollToTop";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
const FAQs = ({ setShowFAQs }) => {
  const [faqModalContent, setFaqModalContent] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();

  const handleFaqClick = (content) => {
    setFaqModalContent(content);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFaqModalContent("");
  };

  return (
    <div className="flex p-2 flex-col items-center">
      <ScrollToTop />
      <div className="flex items-center w-full mb-4">
        <GoChevronLeft
          className="text-2xl text-black cursor-pointer"
          onClick={() => navigate("/profile")}
        />
        <h2 className="text-xl text-black font-opensans ml-2">FAQs</h2>
      </div>
      <div className="w-full mt-4 font-opensans">
        {[
          "What is your shipping policy?",
          "My order arrived damaged. How do we fix this?",
          "I received the wrong item. What do I do?",
          "How do I cancel/change an order?",
          "Pickup codes explained",
          "My order is taking so long. What next?",
          "I wasn’t refunded my initial total payment. Why?",
          "I want to become a vendor.",
          "What is stockpiling?",
          "What is the buyer protection fee?",
          "What are service fees?",
        ].map((faq) => (
          <div
            key={faq}
            className="flex flex-col rounded-xl bg-customGrey mb-4 items-center w-full"
          >
            <div
              className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
              onClick={() => handleFaqClick(faq)}
            >
              <p className="text-base font-normal font-opensans text-black capitalize w-full">
                {faq}
              </p>
              <FaAngleRight className="text-black" />
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40"
            >
              <motion.div
                key="edit-modal"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "tween", duration: 0.3 }}
                className="fixed bottom-0 z-[6000] left-0 right-0 h-[40vh] bg-white rounded-t-2xl shadow-xl flex flex-col"
              >
                <div className="relative h-full">
                  <div className="mt-6 flex items-center px-4 font-semibold justify-between">
                    <h1 className=" text-2xl text-black">{faqModalContent}</h1>
                    <LiaTimesSolid
                      className="text-2xl cursor-pointer absolute top-4 right-4"
                      onClick={closeModal}
                    />
                  </div>
                  <div className="px-4 mt-8">
                    {faqModalContent === "What is your shipping policy?" && (
                      <p className="text-base font-opensans font-light text-black">
                        We offer pickup and delivery services based on vendor
                        preferences. For delivery, we utilize convenient and
                        reliable shipping partners chosen by our vendors.
                        Shipping usually takes between 3-7 days, depending on
                        your location.
                      </p>
                    )}
                    {faqModalContent ===
                      "My order arrived damaged. How do we fix this?" && (
                      <p className="text-base font-opensans font-light text-black">
                        If your order arrives damaged, please contact our
                        customer support with clear pictures and your order ID.
                        We will investigate promptly and assist you in receiving
                        a replacement or a refund.
                      </p>
                    )}
                    {faqModalContent ===
                      "I received the wrong item. What do I do?" && (
                      <p className="text-base font-opensans font-light text-black">
                        If you receive the incorrect item, contact our support
                        team with your order ID, a photo of the item you
                        received, and a description of what you originally
                        ordered. We'll resolve the issue quickly to ensure your
                        satisfaction.
                      </p>
                    )}
                    {faqModalContent === "How do I cancel/change an order?" && (
                      <p className="text-base font-opensans font-light text-black">
                        Orders can only be canceled or modified shortly after
                        placing them, provided the vendor has not started
                        processing your order. Note that funds from canceled
                        orders are refunded to your wallet. Contact our support
                        team immediately to request any changes.
                      </p>
                    )}
                    {faqModalContent === "Pickup codes explained" && (
                      <p className="text-base font-opensans font-light text-black">
                        Pickup codes are 4-digit verification codes generated
                        when placing a pickup order. You'll receive this code to
                        confirm your delivery before the handoff of your items.
                      </p>
                    )}
                    {faqModalContent ===
                      "My order is taking so long. What next?" && (
                      <p className="text-base font-opensans font-light text-black">
                        If your order is delayed, first check the current order
                        status on the app. If it has exceeded the expected
                        delivery date, please reach out to customer support and
                        we'll help track it down.
                      </p>
                    )}
                    {faqModalContent ===
                      "I wasn’t refunded my initial total payment. Why?" && (
                      <p className="text-base font-opensans font-light text-black">
                        Refunds are usually processed the same day a vendor
                        declines an order, If you haven't received your refund,
                        please contact support with your transaction details.
                        Refunds typically reflect the total amount minus the
                        service fee and any transaction charges, credited back
                        to your in-app wallet.
                      </p>
                    )}
                    {faqModalContent === "I want to become a vendor." && (
                      <p className="text-base font-opensans font-light text-black">
                        To become a vendor, sign up on our platform, submit your
                        business details, and await approval. Once approved, you
                        can start selling immediately.
                      </p>
                    )}
                    {faqModalContent === "What is stockpiling?" && (
                      <p className="text-base font-opensans font-light text-black">
                        Stockpiling allows you to purchase mutiple items from
                        different vendors and have them stored safely until
                        you're ready for combined delivery. It's a convenient
                        way to save on shipping and manage your orders
                        efficiently.
                      </p>
                    )}
                    {faqModalContent ===
                      "What is the buyer protection fee?" && (
                      <p className="text-base font-opensans font-light text-black">
                        The Buyer protection fee ensures the safety of your
                        stockpiled items while awaiting shipment or pickup. It
                        provides extra security, guaranteeing your items are
                        protected until they reach you.
                      </p>
                    )}
                    {faqModalContent === "What are service fees?" && (
                      <p className="text-base ml-4 font-opensans font-light text-black">
                        Service fees are dynamic charges applied to transactions
                        to support the app's operations and customer support
                        teams. These fees are capped at a fixed amount, so no
                        need to worry about excessive charges.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FAQs;
