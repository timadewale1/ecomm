import React from "react";
import { GoChevronLeft } from "react-icons/go";
import { useNavigate } from "react-router-dom";

const CallGuide = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center bg-gray-50 min-h-screen pb-4 font-opensans text-gray-800">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 flex items-center justify-between w-full px-3 py-4 border-b shadow-sm">
        <div className="flex items-center space-x-2">
          <GoChevronLeft
            className="text-2xl text-black cursor-pointer"
            onClick={() => navigate(-1)}
          />
          <h1 className="text-lg font-semibold text-gray-900">
            Call Guidelines
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md p-2">
        <div className="bg-customOrange flex relative text-center p-10  rounded-md justify-center items-center h-72 mb-3">
          <div className="absolute top-0 right-0">
            <img src="./Vector.png" alt="" className="w-16 h-24" />
          </div>
          <div className="absolute bottom-0 left-0">
            <img src="./Vector2.png" alt="" className="w-16 h-16" />
          </div>
          <h2 className="text-2xl text-white font-bold ">Guidelines for Speaking with Customers to Confirm Orders or Request Delivery Fee Payment</h2>
        </div>
        <p className="text-black text-sm">
          <span className="text-customOrange">Dear Vendor,</span>
          <br />
          When speaking with customers to confirm their orders or request
          delivery fee payments, professionalism and politeness are key. As My
          Thrift does not charge customers delivery fees upfront (to allow for
          flexibility based on location and item specifics), we rely on you, our
          vendors, to handle this communication efficiently and courteously.
        </p>
        <h2 className="text-customOrange text-[16px] underline my-3">Here are the essential points to keep in mind:</h2>
        <ul className="text-black text-sm space-y-3">
          <li>
            <strong className="text-customOrange">Be Polite and Respectful:</strong> Approach every
            conversation with a friendly and professional tone. Remember, how
            you speak reflects both your business and the My Thrift brand.
          </li>
          <li>
            <strong className="text-customOrange">Provide Clear Information:</strong> Make sure the customer
            understands why you’re calling, the details of the delivery, and the
            estimated delivery fee based on their location and the item ordered.
          </li>
          <li>
            <strong className="text-customOrange">Use the Provided Delivery Estimates:</strong> Use the
            estimates provided by our platform as a guide, but confirm the exact
            fee with your chosen logistics provider before speaking to the
            customer.
          </li>
          <li>
            <strong className="text-customOrange">Stay Flexible and Patient:</strong> Customers may have
            questions or need a moment to arrange payment. Be patient and
            provide them with any additional information they need to feel
            confident.
          </li>
          <li>
            <strong className="text-customOrange">Never Force or Pressure:</strong> Ensure the customer feels
            comfortable. If there are delays in payment, reassure them politely
            and work towards a resolution.
          </li>
        </ul>

        <h2 className="text-customOrange text-[16px] underline my-3">Example: Professional Two-Person Call Script</h2>
        <div className="p-3 rounded-2xl border-2 border-dashed border-customOrange bg-customOrange bg-opacity-20 text-sm space-y-2">
          <p className="text-black">
            <strong className="text-customOrange">Vendor:</strong> Hello, this is Fendi Store from My Thrift.
            Am I speaking with [Customer's Name]?
          </p>
          <p className="text-black">
            <strong className="text-customOrange">Customer:</strong> Yes, this is [Customer's Name].
          </p>
          <p className="text-black">
            <strong className="text-customOrange">Vendor:</strong> Great! Thank you for placing your order
            with us. We received your order for [Product Name], and we’re
            preparing to ship it out. Before we proceed, we’d like to confirm
            the delivery fee. Based on your location, the delivery fee is
            estimated at ₦[Fee Range]. Could you confirm if this works for you?
          </p>
          <p className="text-black">
            <strong className="text-customOrange">Customer:</strong> Yes, that’s fine. How do I pay?
          </p>
          <p className="text-black">
            <strong className="text-customOrange">Vendor:</strong> Thank you! You can make the payment via
            [Payment Method, e.g., transfer or Paystack link]. Once we receive
            the payment, we’ll dispatch your order and send you the tracking
            details.
          </p>
          <p className="text-black">
            <strong className="text-customOrange">Customer:</strong> Alright, I’ll make the payment now.
          </p>
          <p className="text-black">
            <strong className="text-customOrange">Vendor:</strong> Perfect, thank you! Once we receive your
            payment, we’ll notify you and ensure your order is shipped
            immediately. If you have any questions, feel free to reach out.
          </p>
          <p className="text-black">
            <strong className="text-customOrange">Customer:</strong> Got it, thank you.
          </p>
          <p className="text-black">
            <strong className="text-customOrange">Vendor:</strong> Thank you for choosing Fendi Store on My
            Thrift! Have a great day.
          </p>
        </div>

        <div>
          <h3 className="text-customOrange text-[16px] underline my-3">Pro Tips for Calls:</h3>
          <ul className="text-sm">
            <li>
              <span className="text-customOrange">1.</span> Always introduce yourself and mention My Thrift to reinforce
              trust.
            </li>
            <li>
              <span className="text-customOrange">2.</span> Speak slowly and clearly to ensure the customer understands all
              the details.
            </li>
            <li>
              <span className="text-customOrange">3.</span> Avoid technical jargon or logistics terms they might not
              understand.
            </li>
          </ul>
        </div>

        <p className="text-black text-sm">
          By maintaining professionalism and a customer-first attitude, you’ll
          foster trust and loyalty while enhancing your reputation as a vendor.
        </p>
        <p className="text-customOrange text-sm">
          <strong>Cheers,</strong>
        </p>
        <p className="text-customOrange text-sm">
          <strong>The My Thrift Team</strong>
        </p>
      </div>
    </div>
  );
};

export default CallGuide;
