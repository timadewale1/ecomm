import { GoChevronLeft, GoDotFill } from "react-icons/go";
import ScrollToTop from "../../components/layout/ScrollToTop";
import { useNavigate } from "react-router-dom";

const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center bg-gray-50 min-h-screen pb-4 font-opensans text-gray-800">
      {/* Header */}
      <div
        id="header"
        className="sticky transition-colors duration-300 top-0 bg-white z-10 flex items-center justify-between w-full py-4 px-3 border-b shadow-sm"
      >
        <div className="flex items-center space-x-2">
          <GoChevronLeft
            className="text-2xl text-black cursor-pointer"
            onClick={() => navigate(-1)}
          />
          <h1 className="text-lg font-semibold text-gray-900">
            Terms and Conditions
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md">
        <ScrollToTop />
        <div
          className="flex bg-customOrange relative text-center items-center rounded-md h-72"
        >
          <div className="absolute top-0 right-0">
            <img src="./Vector.png" alt="" className="w-16 h-24" />
          </div>
          <div className="absolute bottom-0 left-0">
            <img src="./Vector2.png" alt="" className="w-16 h-16" />
          </div>
          <h2 className="text-6xl text-white font-bold">
            Terms and Conditions
          </h2>
        </div>
        <div className="px-3">

          <p className="text-xs text-gray mb-3 mt-3">
            ©2024 My Thrift Clothing. Ltd, ALL RIGHTS RESERVED. Kindly refer to
            the legal notice below for our Terms and Conditions.
          </p>
          <div className="flex flex-col">
            <p className="text-black text-lg font-bold mb-3">
              Terms and Conditions of My Thrift Clothing, Ltd.
            </p>
            <a
              href="#1"
              className="text-black hover:text-customSoftGray underline cursor-pointer"
            >
              1. Introduction
            </a>
            <a
              href="#2"
              className="text-black hover:text-customSoftGray underline cursor-pointer"
            >
              2. Account Creation & Registration
            </a>
            <a
              href="#3"
              className="text-black hover:text-customSoftGray underline cursor-pointer"
            >
              3. Payments & Service Fees
            </a>
            <a
              href="#4"
              className="text-black hover:text-customSoftGray underline cursor-pointer"
            >
              4. Sales Agreement
            </a>
            <a
              href="#5"
              className="text-black hover:text-customSoftGray underline cursor-pointer"
            >
              5. Logistic Terms
            </a>
            <a
              href="#6"
              className="text-black hover:text-customSoftGray underline cursor-pointer"
            >
              6. Refund and Return Policy
            </a>
            <a
              href="#7"
              className="text-black hover:text-customSoftGray underline cursor-pointer"
            >
              7. Intellectual Property Disputes
            </a>
            <a
              href="#8"
              className="text-black hover:text-customSoftGray underline cursor-pointer"
            >
              8. Limited Liability
            </a>
            <a
              href="#9"
              className="text-black hover:text-customSoftGray underline cursor-pointer"
            >
              9. Governing Law
            </a>
          </div>
        </div>

        <div className="space-y-6 text-sm py-6 px-3">
          {/* Introduction */}
          <section id="1" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-customOrange text-lg font-semibold mb-2">
              1. Introduction
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">1.1</span> This e-commerce
              website and mobile application, together with the payment
              infrastructures in place and supporting logistics, is owned and
              controlled by My Thrift Clothing Ltd, which has the following
              mailing address: <a className="text-customOrange" href="mailto:hello@shopmythrift.online">hello@shopmythrift.online</a>.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">1.2</span> These terms and
              conditions constitute a contractual agreement between you and My
              Thrift Clothing Ltd (where applicable,” My Thrift,” “Platform,”
              ”company,” “we,” “us,” and “our” shall be used to refer to My
              Thrift. Ltd, and “you,” “your,” or “user/s” shall collectively or
              respectively refer to vendors and buyers).
            </p> 
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">1.3</span> By using our
              platform, you fully agree to our general terms and conditions. Any
              disagreement thereof shall amount to your immediate disuse of our
              platform.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">1.4</span> We reserve the
              right to update or modify our terms of use, including our Privacy
              Policy, at any point in time. Notices of such changes will be
              provided by any reasonable means we deem fit or at our sole
              discretion.
            </p>
          </section>

          {/* Account Creation & Registration */}
          <section id="2" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-lg font-semibold text-customOrange mb-2">
              2. Account Creation & Registration
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">2.1</span> You must be at
              least 18 years of age to create an account or be registered on our
              platform. By agreeing to our terms and conditions and using our
              platform, you represent that you are of the age stipulated.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">2.2</span> You may create an
              account and register your business or customer account on My
              Thrift by filling out and submitting the registration form.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">2.3</span> You represent that
              all information provided in the registration form is credible and
              accurate.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">2.4</span> You are responsible
              for maintaining the confidentiality of your account and password
              and restricting access to your computer, and this requires that;
            </p>
            <ul className="list-disc leading-relaxed space-y-2 mt-2">
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-2" />
                </div>
                <p className="text-black">
                  You agree to accept responsibility for all the activities that
                  occur under your account or password to the extent permitted
                  by applicable law.
                </p>
              </li>
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-2" />
                </div>
                <p className="text-black">
                  You take all necessary steps to ensure that your password is
                  secured and confidential.
                </p>
              </li>
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-2" />
                </div>
                <p className="text-black">
                  You must inform us the moment you have any reason to believe
                  that your password or account has been compromised or accessed
                  in an unauthorized manner.
                </p>
              </li>
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-2" />
                </div>
                <p className="text-black">
                  You must exclusively control and use your account, and under
                  no circumstance shall you transfer your account to a third
                  party. Any complications or issues that arise from a voluntary
                  third-party account transfer shall be at your own risk.
                </p>
              </li>
            </ul>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">2.5</span> We may terminate,
              restrict, edit, or update your account with or without giving
              advance notice if you go against our terms of use or during the
              course of a technical upgrade.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">2.6</span> You may cancel your
              account on our platform at any point in time, provided you contact
              our support team.
            </p>
          </section>

          {/* Payments & Service Fees */}
          <section id="3" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-lg font-semibold text-customOrange mb-2">
              3. Payments & Service Fees
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">3.1</span> Vendors are allowed
              to advertise, make sales, and accept payments on our platform and
              across all our other channels.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">3.2</span> Vendors will
              receive 60% of the subtotal of customer payments till orders have
              been fulfilled, after which they receive the remaining 40%.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">3.3</span> My Thrift will take
              no percentage cuts from vendor sales. However, we reserve the
              right to modify provisions in this regard at a later date.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">3.4</span> My Thrift employs
              the service of third-party payment processors. In view of this,
              you will be charged a small transaction fee for every purchase
              made by these entities.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">3.5</span> My Thrift imposes
              service fees. These fees are dynamic and used to support our
              business operations. To foster fairness and transparency, our
              service fee charges are capped at a maximum of ₦ 2,000.
            </p>
          </section>

          {/* Sales Agreement */}
          <section id="4" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-lg font-semibold text-customOrange mb-2">
              4. Sales Agreement
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">4.1</span> My Thrift permits
              third-party sellers or vendors to list and sell their products on
              our e-commerce platform. Our role is none other than that of a
              compensated transaction facilitator. To explain further, we are
              neither the buyer nor seller of the products displayed on our
              platform.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">4.3</span> My Thrift provides
              a platform for buyers and sellers to negotiate and conclude
              transactions. The contract formed at the completion of the sale of
              third-party products is, therefore, solely between the buyer and
              seller.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">4.3</span> My Thrift shall
              assist sellers in connecting with buyers in order to facilitate or
              conclude transactions. Registered sellers are allowed to contact
              registered buyers outside the platform with the sole purpose of
              concluding sales.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">4.4</span> Buyer or customer
              information will be shared with vendors or sellers on our platform
              in line with provision 4.3.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">4.5</span> Vendors are allowed
              to cancel or decline customer orders if products are later found
              to be out of stock or unavailable.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">4.6</span> My Thrift only
              assumes responsibility for issues that arise from failures that
              may arise on our part to facilitate transactions. Any disputes
              regarding third-party products, buyers, and vendors should be
              resolved using the chatbox or any means of communication provided
              on the platform. We assume no responsibility for such disputes.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">4.7</span> The seller is
              responsible for the sale of their products and for dealing with
              buyer claims or any other issue resulting from the contract of
              sale.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">4.8</span> Subject to our
              general terms and conditions, the seller’s terms of the
              transaction shall govern the sale and purchase agreement between
              the buyer and the seller. However, the following provisions must
              be observed;
            </p>
            <ul className="list-disc leading-relaxed space-y-2 mt-2">
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-2" />
                </div>
                <p className="text-black">
                  The product must be of the quality described and meet the
                  reasonable expectations of an everyday buyer of the product
                  type in question.
                </p>
              </li>
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-2" />
                </div>
                <p className="text-black">
                  The prices for products must be stated in necessary product
                  listings and must include taxes that comply with applicable
                  laws.
                </p>
              </li>
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-2" />
                </div>
                <p className="text-black">
                  The seller represents and warrants that he/she has good title
                  to the goods sold and is the sole beneficial or legal owner.
                </p>
              </li>
            </ul>
          </section>

          {/* Logistic Terms */}
          <section id="5" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-lg font-semibold text-customOrange mb-2">
              5. Logistic Terms
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">5.1</span> Deliveries or
              logistics of goods shall be facilitated by vendors either through
              third-party agents or by vendors themselves.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">5.2</span> Delivery fees or
              prices can change at any time. We are not responsible for
              modifying price listings in this regard.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">5.3</span> Orders marked
              delivered by vendors can be reviewed once buyers lodge tenable
              complaints. We will not entertain subsequent customer complaints
              or take responsibility for unfulfilled deliveries once complaints
              have been vetted and found to be untenable
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">5.4</span> Vendors are liable
              to get their accounts deactivated, restricted, or deleted if found
              guilty of marking an order fulfilled when, in fact, the order is
              yet to be dispatched or sent out for delivery, and no confirmation
              from the logistics company in this regard was requested.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">5.5</span> Delivery time may
              exceed the estimated time stated due to unforeseen circumstances
              or situations beyond our control, and we take no responsibility
              for issues that may arise as a result.
            </p>
          </section>

          {/* Refund and Return Policy */}
          <section id="6" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-lg font-semibold text-customOrange mb-2">
              6. Refund and Return Policy
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">6.1</span> My Thrift is not
              responsible for providing buyers with refunds. In the case of
              issues with products, vendors can, at their sole discretion, offer
              a refund to customers.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">6.2</span> My Thrift is not
              responsible for the return of goods. In the case of issues with
              products, vendors can, at their sole discretion, allow the return
              of products delivered.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">6.3</span> In the instance of
              a declined or canceled order by a registered vendor, we shall
              facilitate a refund to the customer or buyer. However, it may be
              processed at an extra charge, fee, or cost borne by the vendor.
            </p>
          </section>

          {/* Intellectual Property Disputes */}
          <section id="7" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-lg font-semibold text-customOrange mb-2">
              7. Intellectual Property Disputes
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">7.1</span> Vendors are
              permitted to post product images and marketing content on our
              platform in order to facilitate sales.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">7.2</span> You grant us a
              non-exclusive, worldwide, royalty-free, and irrevocable right to
              use, translate, store, adapt, publish, and distribute content you
              provide across all our marketing channels, either in existence or
              to be created at a future date.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">7.3</span> Your moral rights
              in your content are hereby waived to the fullest extent permitted
              by applicable laws.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">7.4</span> You are not under
              any circumstance to make use of or share content that infringes
              upon the intellectual property rights or copyright of any person
              on our platform.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">7.5</span> We will not be
              responsible for copyright or intellectual property rights
              infringements by users. We will, however, take down infringing
              content or texts uploaded by users after vetting rightful
              complaints by wronged parties.
            </p>
          </section>

          {/* Limited Liability */}
          <section id="8" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-lg font-semibold text-customOrange mb-2">
              8. Limited Liability
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">8.1</span> We do not control
              or guarantee the quality and existence of the items displayed or
              marketed on our platform, nor do we guarantee the accuracy or
              truth of the information registered vendors or buyers provide.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">8.2</span> We do not undertake
              to provide satisfactory quality products or sales items and any
              other warranty of such nature, whether express or implied.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">8.3</span> No term or
              condition in this notice limits or excludes our liability for
              personal injury occurring as a result of our fraudulent
              misrepresentation or negligence or any other liability that cannot
              be limited or excluded by law.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">8.4</span> We will not be held
              liable for any exemplary, incidental, punitive, or special damage
              arising from your inability to access or use our platform.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">8.5</span> We will not be held
              liable for any damage you incur from using or tampering with our
              platform or services in an unauthorized manner.
            </p>
          </section>

          {/* Governing Law */}
          <section id="9" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-lg font-semibold text-customOrange mb-2">
              9. Governing Law
            </h3>
            <p className="leading-relaxed text-black">
              The terms and conditions of our platform are governed by the laws
              of Nigeria. Any dispute that may arise regarding the
              interpretation, validity, and/or execution of these terms will be
              settled or resolved under the exclusive jurisdiction of the
              Nigerian courts.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
