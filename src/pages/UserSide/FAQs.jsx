import React, { useState } from "react";
import { FaAngleLeft, FaAngleRight, FaTimes } from "react-icons/fa";

const FAQs = ({ setShowFAQs }) => {
  const [faqModalContent, setFaqModalContent] = useState("");

  const handleFaqClick = (content) => {
    setFaqModalContent(content);
  };

  return (
    <div className="flex p-2 flex-col items-center">
      <FaAngleLeft
        className="text-2xl text-black cursor-pointer self-start"
        onClick={() => setShowFAQs(false)}
      />
      <h2 className="text-xl text-black font-ubuntu">FAQs</h2>
      <div className="w-full mt-4">
        <div className="flex flex-col items-center w-full">
          <hr className="w-full border-gray-600" />
          <div
            className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
            onClick={() => handleFaqClick("What is Booking Fee?")}
          >
            <p className="text-lg font-semibold text-black capitalize w-full">
              What is Booking Fee?
            </p>
            <FaAngleRight className="text-black" />
          </div>
          <hr className="w-full border-gray-600" />
        </div>
        <div className="flex flex-col items-center w-full mt-2">
          <hr className="w-full border-gray-600" />
          <div
            className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
            onClick={() => handleFaqClick("How do I become a vendor?")}
          >
            <p className="text-lg font-semibold text-black capitalize w-full">
              How do I become a vendor?
            </p>
            <FaAngleRight className="text-black" />
          </div>
          <hr className="w-full border-gray-600" />
        </div>
      </div>

      {faqModalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
            <FaTimes
              className="absolute top-2 right-2 text-black cursor-pointer"
              onClick={() => setFaqModalContent("")}
            />
            <h2 className="text-xl font-semibold mb-4">{faqModalContent}</h2>
            {faqModalContent === "What is Booking Fee?" && (
              <p className="font-ubuntu text-center flex">
                The booking fee is a nominal charge that ensures the reservation
                and secure storage of your selected items until pick-up. This
                fee covers the costs associated with maintaining and managing
                the inventory in the vendor's store. By paying a booking fee,
                you not only guarantee the availability of your desired items
                but also build trust with the vendor, enhancing the likelihood
                of a successful purchase. This fee is an investment in a
                seamless shopping experience, ensuring that your chosen products
                are held exclusively for you until you are ready to collect
                them.
              </p>
            )}
            {faqModalContent === "How do I become a vendor?" && (
              <p className="font-ubuntu text-center flex">
                To become a vendor, start by registering your business on our
                platform. Once your registration is complete, our dedicated team
                will review and vet your application. Upon approval, you will
                gain access to your very own virtual store, where you can list
                and sell your products to a wide audience. This process ensures
                that only reputable businesses are featured on our platform,
                enhancing trust and credibility with potential buyers. By
                becoming a vendor, you can expand your reach, boost sales, and
                grow your business with ease.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQs;
