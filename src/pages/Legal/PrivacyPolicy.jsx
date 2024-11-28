import React from "react";
import { GoChevronLeft, GoDotFill } from "react-icons/go";
import ScrollToTop from "./../../components/layout/ScrollToTop";
import "./design.css";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center bg-gray-50 min-h-screen pb-4 font-opensans text-gray-800">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 flex items-center justify-between w-full p-4 border-b shadow-sm">
        <div className="flex items-center space-x-2">
          <GoChevronLeft
            className="text-2xl text-black cursor-pointer"
            onClick={() => navigate(-1)}
          />
          <h1 className="text-lg font-semibold text-gray-900">
            Privacy Policy
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md ">
        <ScrollToTop />
        <div className="bg-customOrange relative text-center bg-white6 p-10  rounded-md overflow-hidden justify-center items-center shadow-gray-700 shadow-xl">
          <div className="absolute top-0 right-0">
            <img src="./Vector.png" alt="" className="w-16 h-24" />
          </div>
          <div className="absolute bottom-0 left-0">
            <img src="./Vector2.png" alt="" className="w-16 h-16" />
          </div>
          <h2 className="text-4xl text-white font-bold ">
             Privacy Policy
          </h2>
        </div>
          <p className="text-sm text-black text-center my-6">
            ©2024 My Thrift Clothing. Ltd, ALL RIGHTS RESERVED. Kindly refer to
            the legal notice below for our Privacy Policy.
          </p>

        <div className="flex flex-col text-center items-center">
          <p className="text-blue-600">My Thrift's Privacy Policy</p>
          <a
            href="#1"
            className="text-customOrange hover:text-customRichBrown hover:underline cursor-pointer"
          >
            1. Overview
          </a>
          <a
            href="#2"
            className="text-customOrange hover:text-customRichBrown hover:underline cursor-pointer"
          >
            2. Introduction
          </a>
          <a
            href="#3"
            className="text-customOrange hover:text-customRichBrown hover:underline cursor-pointer"
          >
            3. User Data We Collect and Purpose
          </a>
          <a
            href="#4"
            className="text-customOrange hover:text-customRichBrown hover:underline cursor-pointer"
          >
            4. User Data We May Share
          </a>
          <a
            href="#5"
            className="text-customOrange hover:text-customRichBrown hover:underline cursor-pointer"
          >
            5. Use of Cookies
          </a>
          <a
            href="#6"
            className="text-customOrange hover:text-customRichBrown hover:underline cursor-pointer"
          >
            6. Rights of Users
          </a>
          <a
            href="#7"
            className="text-customOrange hover:text-customRichBrown hover:underline cursor-pointer"
          >
            7. Contact Details
          </a>
        </div>

        <div className="space-y-6 text-sm py-6 px-3">
          {/* Overview */}
          <section id="1" className="pt-4 scroll-mt-14">
            <h3 className="text-customOrange text-lg font-semibold mb-2 ">
              1. Overview
            </h3>
            <p className="leading-relaxed text-black">
              This privacy policy explains or helps you understand how My Thrift
              Clothing. Ltd (” My Thrift,” “Platform,” or ”Company”) processes,
              stores, shares, protects, and uses the data you provide in
              connection with the services we offer. We understand the
              importance of transparency and confidentiality when dealing with
              your personal information, and thank you for trusting us to do
              what is required to provide a safe, secure, and sustainable user
              experience.
            </p>
          </section>

          {/* Introduction */}
          <section id="2" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-lg font-semibold text-customOrange mb-2 ">
              2. Introduction
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">2.1</span> My Thrift Clothing,
              Ltd. owns and controls this website and mobile application.
              Therefore, we may act as an “administrator” of your personal data
              and take responsibility for the processing and protection of your
              personal information or data.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">2.2</span> We reserve the
              right to alter/modify this Policy at any time to reflect changes
              in how we process or deal with your data as time goes on. Notices
              of such changes will be given through any reasonable means we deem
              fit.
            </p>
          </section>

          {/* User Data We Collect and Purpose */}
          <section id="3" className="pt-4 scroll-mt-14">
            <h3 className="text-lg font-semibold text-customOrange mb-2 ">
              3. User Data We Collect and Purpose
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">3.1</span> We collect your
              personal information to provide you with our services and
              continually improve our platform. Here’s a detailed breakdown of
              the user data we collect and the purpose.
            </p>
            <div class="overflow-x-auto mt-4">
              <table class="min-w-full table-auto border-collapse border border-gray-300 rounded-md">
                <thead>
                  <tr class="bg-customOrange text-white">
                    <th class="px-4 py-2 border border-gray-300 text-left">
                      Personal Data Type
                    </th>
                    <th class="px-4 py-2 border border-gray-300 text-left">
                      Purpose
                    </th>
                  </tr>
                </thead>
                <tbody class="text-gray-800">
                  <tr>
                    <td class="px-4 py-2 border border-gray-300">
                      Contact information, such as phone numbers and email
                      addresses.
                    </td>
                    <td class="px-4 py-2 border border-gray-300">
                      To provide users access to all our platforms (website and
                      mobile application) and share service-related information.
                    </td>
                  </tr>
                  <tr>
                    <td class="px-4 py-2 border border-gray-300">
                      Location data, such as house address and zip code.
                    </td>
                    <td class="px-4 py-2 border border-gray-300">
                      To connect vendors and buyers in close range and
                      efficiently process delivery requests.
                    </td>
                  </tr>
                  <tr>
                    <td class="px-4 py-2 border border-gray-300">
                      Communication history across all company channels,
                      including our customer service hotlines and instant
                      chatboxes.
                    </td>
                    <td class="px-4 py-2 border border-gray-300">
                      To respond to complaints and requests and keep users
                      updated or informed on company services.
                    </td>
                  </tr>
                  <tr>
                    <td class="px-4 py-2 border border-gray-300">
                      Your device data/information and site usage data.
                    </td>
                    <td class="px-4 py-2 border border-gray-300">
                      To improve our platform, troubleshoot technical problems,
                      conduct fault analyses, set default options, and maintain
                      our systems.
                    </td>
                  </tr>
                  <tr>
                    <td class="px-4 py-2 border border-gray-300">
                      Automatic information collection by our site or bots, such
                      as browser type, operating system, and device-related
                      information.
                    </td>
                    <td class="px-4 py-2 border border-gray-300">
                      To investigate and prevent security breaches, fraud, or
                      any other illegal activity. To monitor our systems and
                      detect unusual activities.
                    </td>
                  </tr>
                  <tr>
                    <td class="px-4 py-2 border border-gray-300">
                      Personal information on your identity may include your
                      national identification number, driver's license, or
                      passport details.
                    </td>
                    <td class="px-4 py-2 border border-gray-300">
                      To carry out regulatory investigations and comply with
                      legal requests from government agencies or legal
                      compliance requirements.
                    </td>
                  </tr>
                  <tr>
                    <td class="px-4 py-2 border border-gray-300">
                      Miscellaneous Data
                    </td>
                    <td class="px-4 py-2 border border-gray-300">
                      We may request certain data or consent to use your
                      personal information to provide personalized services or
                      improve our platform.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* User Data We May Share */}
          <section id="4" className="pt-4 scroll-mt-14">
            <h3 className="text-lg font-semibold text-customOrange mb-2 ">
              4. User Data We May Share
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">4.1</span> We may disclose or
              provide your personal information to the following service
              providers or third parties for the reasons stated below.
            </p>
            <ul className="list-disc leading-relaxed space-y-2 mt-2">
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-2" />
                </div>
                <div>
                  <strong>Within Our Company:</strong> We may share your
                  personal information with our subsidiaries or group companies
                  in existence at present or at a later date to onboard users on
                  new services they consent to or improve platform operations.
                </div>
              </li>
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-2" />
                </div>
                <div>
                  <strong>Customer Service Providers:</strong> We may outsource
                  our customer services to competent industry professionals to
                  improve customer relations and communications, this will
                  require us to share personal information such as phone numbers
                  and email addresses.
                </div>
              </li>
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-2" />
                </div>
                <div>
                  <strong>Cybersecurity Professionals:</strong> We may share
                  your personal information with third-party cybersecurity
                  companies to better protect our platform from security
                  breaches and fraud, better verify user identities, and reduce
                  credit risk.
                </div>
              </li>
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-2" />
                </div>
                <div>
                  <strong>IT Service Providers:</strong> We may share your
                  personal information with IT service providers and certain
                  software services providers, such as system maintenance and
                  web hosting services, customer relationship management
                  software, and mobile application services.
                </div>
              </li>
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-2" />
                </div>
                <div>
                  <strong>Regulators or Government Agencies:</strong> We have
                  the right to share your personal information with state-owned
                  regulators or government agencies in compliance with court
                  orders or any other legal demand and to protect our corporate
                  interests from judicial proceedings or lawsuits.
                </div>
              </li>
            </ul>
            <p className="leading-relaxed text-black mt-2">
              <span className="text-customOrange">4.2</span> We may disclose
              personal information you consent to for any purpose we officially
              make known to you.
            </p>
          </section>

          {/* Use of Cookies */}
          <section id="5" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-lg font-semibold text-customOrange mb-2">
              5. Use of Cookies
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">5.1</span> We may use cookies
              or other tracking technologies to collect information across all
              our platforms automatically. Cookies are bits of code or small
              text files that allow us or our site providers to recognize your
              browser and collect/remember information that typically does not
              directly identify you.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">5.2</span> Your browser or
              device may provide you with the option to reject some or all of
              our site cookies.
            </p>
          </section>

          {/* Rights of Users */}
          <section id="6" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-lg font-semibold text-customOrange mb-2">
              6. Rights of Users
            </h3>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">6.1</span> You have the right
              to access, correct, change, or delete the personal information you
              provide us with.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">6.2</span> You may withdraw
              your consent to the processing of your personal information if we
              provide you with the option.
            </p>
            <p className="leading-relaxed text-black">
              <span className="text-customOrange">6.3</span> You may lodge a
              complaint if you feel we have gone against or violated your
              privacy rights. Formal complaints should be sent to us at -enter
              email address-.
            </p>
          </section>

          {/* Contact Details */}
          <section id="7" className="pt-4 scroll-mt-14 space-y-3">
            <h3 className="text-lg font-semibold text-customOrange mb-2">
              7. Contact Details
            </h3>
            <p className="leading-relaxed text-black">
              If you have any queries or questions regarding the information
              provided in our Privacy Policy, contact the following customer
              lines and email addresses
            </p>
            <ul className="list-disc list-inside leading-relaxed space-y-2">
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-1" />
                </div>
                <p className="text-black">MyThrift Hotline: +234___________</p>
              </li>
              <li className="flex w-full">
                <div>
                  <GoDotFill className="text-customOrange text-lg mr-2 mt-1" />
                </div>
                <p className="text-black">
                  Inquiry Email: -input email address-
                </p>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
