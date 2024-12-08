import React from 'react';
import { GoChevronLeft } from 'react-icons/go';
import { useNavigate } from 'react-router-dom';

const DeliveryGuide = () => {
  const navigate = useNavigate()

  return (
    <div className="p-2 font-opensans">
      <GoChevronLeft
        className="text-3xl cursor-pointer"
        onClick={() => navigate(-1)}
      />
      <div className="p-2 space-y-3">
      <h1 className='text-customOrange text-lg'>Order Delivery Guide for Vendors</h1>
      <p className="text-black text-sm">
        <span className="text-customOrange">Dear Vendor,</span>
        <br />
        Delivering orders successfully and on time is essential to building customer trust and maintaining
        a smooth workflow. To ensure the best experience for both you and your customers, we’ve created a
        comprehensive guide to streamline your order delivery process.
      </p>

      <h2 className="text-customOrange underline text-lg">1. Confirm Before Marking as Delivered</h2>
      <p className="text-black">
        Always confirm with the rider or logistics company that the order has been successfully delivered
        to the customer before marking it as delivered in the app. Failure to confirm delivery may result
        in penalties or other actions as deemed necessary.
      </p>

      <h2 className="text-customOrange underline text-lg">2. Use Trusted Logistics Services</h2>
      <p className="text-black">
        Work only with reliable and well-reviewed logistics providers that ensure timely deliveries and proper
        handling of packages. For in-state deliveries, based on our research, we recommend using Bolt or Uber,
        as they often deliver on the same day and are cost-effective. If you have a personal rider, that’s even
        better! This approach builds customer confidence and minimizes delivery-related issues.
      </p>

      <h2 className="text-customOrange underline text-lg">3. Provide Accurate Delivery Information</h2>
      <p className="text-black">
        Double-check all delivery details, including customer addresses, phone numbers, and special instructions.
        Accuracy in this step ensures a smooth and efficient delivery process.
      </p>

      <h2 className="text-customOrange underline text-lg">4. Track Every Delivery</h2>
      <p className="text-black">
        Utilize tracking systems or request real-time updates from your logistics partners to monitor the
        progress of deliveries. Staying proactive helps address delays before they escalate.
      </p>

      <h2 className="text-customOrange underline text-lg">5. We Notify Customers of Delivery Progress</h2>
      <p className="text-black">
        Customers rely on the delivery status you provide in the app for updates. Providing incorrect status
        information may lead to customer dissatisfaction and could result in restrictions or penalties.
      </p>

      <h2 className="text-customOrange underline text-lg">6. Inspect Orders Before Dispatch</h2>
      <p className="text-black">
        Verify the quality and quantity of items before handing them over to the delivery personnel. This
        precaution reduces the likelihood of customer complaints due to missing or damaged items.
      </p>

      <h2 className="text-customOrange underline text-lg">7. Stay Professional with Riders</h2>
      <p className="text-black"ath>
        Maintain a respectful and professional relationship with your delivery personnel. Clear communication
        and mutual respect contribute to smooth and efficient deliveries.
      </p>

      <h2 className="text-customOrange underline text-lg">8. Have a Backup Plan</h2>
      <p className="text-black">
        Always have alternative logistics options in case your primary service provider is unavailable. This
        ensures uninterrupted delivery operations.
      </p>

      <h2 className="text-customOrange underline text-lg">9. Address Customer Complaints Promptly</h2>
      <p className="text-black">
        If customers have any issues, address them swiftly and professionally. Although we handle customer
        disputes in-house, your prompt attention to concerns can make a significant difference in retaining trust.
      </p>

      <h2 className="text-customOrange underline text-lg">10. Use Secure Packaging</h2>
      <p className="text-black">
        Protect your products with secure and weather-resistant packaging. We recommend using our custom-branded
        bags for a customer's first order to make a strong impression. Professional packaging minimizes the risk
        of damage during transit and reinforces your brand image.
      </p>

      <div className='rounded-2xl border-2 border-dashed border-customOrange bg-customOrange bg-opacity-20 p-2 text-center items-center'>
        <p className="text-black">
          Delivering a great experience starts with ensuring every order reaches your customers on time and in
          perfect condition. By following these guidelines, you’ll build stronger customer relationships and boost
          your reputation as a trusted vendor.
        </p>
      </div>
        <p className="text-customOrange"><strong>Cheers,</strong></p>
        <p className="text-customOrange"><strong>The My Thrift Team</strong></p>
    </div>
    </div>
  );
};

export default DeliveryGuide;
