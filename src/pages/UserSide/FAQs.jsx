import React, { useState } from "react";
import Modal from "react-modal";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa";
import { LiaTimesSolid } from "react-icons/lia";
import { GoChevronLeft } from "react-icons/go";
import ScrollToTop from "../../components/layout/ScrollToTop";
const FAQs = ({ setShowFAQs }) => {
  const [faqModalContent, setFaqModalContent] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

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
     <ScrollToTop/> 
      <div className="flex items-center w-full mb-4">
        <GoChevronLeft
          className="text-2xl text-black cursor-pointer"
          onClick={() => setShowFAQs(false)}
        />
        <h2 className="text-xl text-black font-ubuntu ml-2">FAQs</h2>
      </div>
      <div className="w-full mt-4">
        {[
          "What is your shipping policy?",
          "My order arrived damaged. How do we fix this?",
          "I received the wrong item. What do I do?",
          "How do I cancel/change an order?",
          "My order is taking so long. What next?",
          "I wasn’t refunded my initial total payment. Why?",
          "I want to become a vendor.",
          "What is declutter?",
          "What are donations?",
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
              <p className="text-base font-normal font-poppins text-black capitalize w-full">
                {faq}
              </p>
              <FaAngleRight className="text-black" />
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="bg-white w-full  h-[50vh] rounded-t-2xl shadow-lg overflow-y-scroll relative flex flex-col"
        overlayClassName="fixed inset-0 bg-gray-900 modal-overlay backdrop-blur-sm bg-opacity-50 flex justify-center items-end z-50"
        ariaHideApp={false}
      >
        <div className="relative h-full">
          <div className="mt-6 flex items-center px-4 font-semibold justify-between">
            <h1 className="font-ubuntu text-2xl text-black">
              {faqModalContent}
            </h1>
            <LiaTimesSolid
              className="text-2xl cursor-pointer absolute top-4 right-4"
              onClick={closeModal}
            />
          </div>
          <div className="px-4 mt-8">
            {faqModalContent === "What is your shipping policy?" && (
              <p className="text-base font-opensans font-light text-black">
                Our shipping policy is designed to ensure the timely and secure
                delivery of your items. Shipping times and costs vary based on
                your location and the selected shipping method. On average,
                shipping takes 3–7 days. We encourage our vendors to use
                reliable and efficient logistics services to guarantee prompt
                delivery and customer satisfaction.
              </p>
            )}
            {faqModalContent ===
              "My order arrived damaged. How do we fix this?" && (
              <p className="text-base font-opensans font-light text-black">
                If your order arrives damaged, please contact our customer
                support team immediately and provide clear photos of the damage.
                After a thorough investigation, we will communicate with the
                vendor and assist you with either a replacement or a refund.
              </p>
            )}
            {faqModalContent === "I received the wrong item. What do I do?" && (
              <p className="text-base font-opensans font-light text-black">
                If you receive the wrong item, please contact our customer
                support team with the order ID, a photo of the item you
                received, and a description of the item you expected. We will
                promptly resolve the issue to ensure your satisfaction.
              </p>
            )}
            {faqModalContent === "How do I cancel/change an order?" && (
              <p className="text-base font-opensans font-light text-black">
                Orders can only be canceled or modified within a limited time
                frame, provided the vendor has not started processing the order.
                Please note that canceled orders are subject to a 10% processing
                fee, along with applicable payment partner charges. To request
                changes or cancellations, contact our support team as soon as
                possible.
              </p>
            )}
            {faqModalContent === "My order is taking so long. What next?" && (
              <p className="text-base font-opensans font-light text-black">
                If your order is delayed, check your order status. If it's past
                the expected delivery date, contact support for assistance.
              </p>
            )}
            {faqModalContent ===
              "I wasn’t refunded my initial total payment. Why?" && (
              <p className="text-base font-opensans font-light text-black">
                Refunds are typically processed on the same day. If you haven't
                received your refund within this time frame, please contact our
                support team with your transaction details. Refunds are issued
                when a vendor declines an order and will reflect your total
                payment minus the service fee and applicable transaction
                charges. Refunds are credited to account that made initial
                payment.
              </p>
            )}
            {faqModalContent === "I want to become a vendor." && (
              <p className="text-base font-opensans font-light text-black">
                To become a vendor, sign up on our platform, submit your
                business details, and await approval to start selling.
              </p>
            )}
            {faqModalContent === "What is declutter?" && (
              <p className="text-base font-opensans font-light text-black">
                Declutter is a feature designed to help you sell pre-loved,
                secondhand, or unwanted items from your home online. It’s a
                great way to create space while earning extra cash. This feature
                is currently in development, and we can't wait to share it with
                our community soon!
              </p>
            )}
            {faqModalContent === "What are donations?" && (
              <p className="text-base font-opensans font-light text-black">
                Donations are a meaningful way to support those in need by
                providing essentials to orphanages and NGOs. Your contributions
                will make a lasting positive impact. This feature is currently
                in development and will be launched soon. Stay tuned!
              </p>
            )}
            {faqModalContent === "What are service fees?" && (
              <p className="text-base ml-4 font-opensans font-light text-black">
                Service fees are dynamic charges applied to transactions to
                support the app's operations and customer support teams. These
                fees are capped at a fixed amount, so no need to worry about
                excessive charges.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FAQs;
