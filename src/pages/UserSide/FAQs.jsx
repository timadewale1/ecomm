import React, { useState } from "react";
import { FaAngleLeft, FaAngleRight, FaRegTimesCircle } from "react-icons/fa";

const FAQs = ({ setShowFAQs }) => {
  const [faqModalContent, setFaqModalContent] = useState("");

  const handleFaqClick = (content) => {
    setFaqModalContent(content);
  };

  return (
    <div className="flex p-2 flex-col items-center">
      <div className="flex items-center w-full mb-4">
        <FaAngleLeft
          className="text-2xl text-black cursor-pointer"
          onClick={() => setShowFAQs(false)}
        />
        <h2 className="text-xl text-black font-ubuntu ml-2">FAQs</h2>
      </div>
      <div className="w-full mt-4">
        <div className="flex flex-col rounded-xl bg-customGrey mb-2 items-center w-full">
          
          <div
            className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
            onClick={() => handleFaqClick("What is Booking Fee?")}
          >
            <p className="text-base font-normal font-poppins text-black capitalize w-full">
              What is Booking Fee?
            </p>
            <FaAngleRight className="text-black" />
          </div>
          
        </div>
        <div className="flex flex-col items-center w-full mt-2">
        
          <div
            className="flex items-center justify-between w-full px-4 py-3 cursor-pointer rounded-xl bg-customGrey mb-2"
            onClick={() => handleFaqClick("How do I become a vendor?")}
          >
            <p className="text-base font-normal font-poppins text-black capitalize w-full">
              How do I become a vendor?
            </p>
            <FaAngleRight className="text-black" />
          </div>
         
        </div>
        <div className="flex flex-col items-center w-full mt-2">
          
          <div
            className="flex items-center justify-between w-full px-4 py-3 cursor-pointer rounded-xl bg-customGrey mb-2"
            onClick={() => handleFaqClick("Do I get a refund for my booking fee?")}
          >
            <p className="text-base font-normal font-poppins text-black capitalize w-full">
              Do I get a refund for my booking fee?
            </p>
            <FaAngleRight className="text-black" />
          </div>
         
        </div>
        <div className="flex flex-col items-center w-full mt-2">
         
          <div
            className="flex items-center justify-between w-full px-4 py-3 cursor-pointer rounded-xl bg-customGrey mb-2"
            onClick={() => handleFaqClick("What are service fees?")}
          >
            <p className="text-base font-normal font-poppins text-black capitalize w-full">
              What are service fees?
            </p>
            <FaAngleRight className="text-black" />
          </div>
         
        </div>
        <div className="flex flex-col items-center w-full mt-2">
         
          <div
            className="flex items-center justify-between w-full px-4 py-3 cursor-pointer rounded-xl bg-customGrey mb-2"
            onClick={() => handleFaqClick("What are donations for?")}
          >
            <p className="text-base font-normal font-poppins text-black capitalize w-full">
              What are donations for?
            </p>
            <FaAngleRight className="text-black" />
          </div>
         
        </div>
      </div>

      {faqModalContent && (
        <div className="fixed p-4 inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
            <FaRegTimesCircle
              className="absolute top-2 right-2 text-black cursor-pointer"
              onClick={() => setFaqModalContent("")}
            />
            <h2 className="text-xl font-semibold mb-4">{faqModalContent}</h2>
            {faqModalContent === "What is Booking Fee?" && (
              <p className="font-ubuntu text-center flex">
                The booking fee is a 20% charge of the product subtotal,
                ensuring vendors reserve your items for up to 3 days. If the
                transaction is not completed within this period, the fee is
                refunded. This fee helps maintain inventory and guarantees item
                availability.
              </p>
            )}
            {faqModalContent === "How do I become a vendor?" && (
              <p className="font-ubuntu text-center flex">
                Register your business on our platform to become a vendor. After a quick review, you'll get your own virtual store to list and sell products to a wide audience. This ensures only reputable businesses are featured, enhancing trust and credibility. Expand your reach, boost sales, and grow your business easily.
              </p>
            )}
            {faqModalContent === "Do I get a refund for my booking fee?" && (
              <p className="font-ubuntu text-center flex">
                Yes, you are refunded your booking fee after 3 days if the transaction is not completed. The bank payment settlement process ensures your money is returned to your account promptly, providing a hassle-free experience.
              </p>
            )}
            {faqModalContent === "What are service fees?" && (
              <p className="font-ubuntu text-center flex">
                Maintaining a SaaS platform involves various costs, including hosting, security, and customer support. Service fees help cover these expenses, ensuring a seamless and secure experience for both vendors and buyers.
              </p>
            )}
            {faqModalContent === "What are donations for?" && (
              <p className="font-ubuntu text-center flex">
                Donations help us give back to the community. Your donated clothes support kids in need and people in need by providing them to orphanage homes and various NGOs. This initiative helps improve the lives of those less fortunate and contributes to a better society.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQs;
