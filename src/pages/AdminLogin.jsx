// import React, { useState } from "react";
// import Helmet from "../components/Helmet/Helmet";
// import { Container, Row, Form, FormGroup } from "reactstrap";
// import { useNavigate, Link } from "react-router-dom";
// import "../styles/login.css";
// import { motion } from "framer-motion";
// import { signInWithEmailAndPassword } from "firebase/auth";
// import { FaAngleLeft, FaRegEyeSlash, FaRegEye } from "react-icons/fa6";
// import { MdEmail } from "react-icons/md";
// import { GrSecure } from "react-icons/gr";
// import { auth } from "../firebase.config";
// import { toast } from "react-toastify";
// import Typewriter from "typewriter-effect";
// import { getUserRole } from "../admin/getUserRole";
// import VendorLoginAnimation from "../components/LoginAssets/VendorLogin";
// import Loading from "../components/Loading/Loading";

// const AdminLogin = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(false);

//   const validateEmail = (email) => {
//     const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return regex.test(email);
//   };

//   const signIn = async (e) => {
//     e.preventDefault();

//     if (!email || !password) {
//       toast.error("Please fill in all fields correctly", { className: "custom-toast" });
//       return;
//     }

//     if (!validateEmail(email)) {
//       toast.error("Invalid email format", { className: "custom-toast" });
//       return;
//     }

//     setLoading(true);

//     try {
//       const userCredential = await signInWithEmailAndPassword(auth, email, password);
//       const user = userCredential.user;
//       const userRole = await getUserRole(user.uid);

//       if (userRole === "admin") {
//         setLoading(false);
//         toast.success("Successfully logged in as admin", { className: "custom-toast" });
//         navigate("/dashboard");
//       } else {
//         setLoading(false);
//         toast.error("Unauthorized user", { className: "custom-toast" });
//         await auth.signOut();
//       }
//     } catch (error) {
//       setLoading(false);
//       toast.error("Unauthorized access", { className: "custom-toast" });
//       console.error("Error logging in:", error);
//     }
//   };

//   return (
//     <Helmet>
//       <section>
//         <Container>
//           <Row>
//             {loading ? (
//               <Loading />
//             ) : (
//               <div className="px-3">
//                 <Link to="/confirm-user-state">
//                   <FaAngleLeft className="text-3xl -translate-y-2 font-normal text-black" />
//                 </Link>
//                 <VendorLoginAnimation />
//                 <div className="flex justify-center text-xl text-customOrange -translate-y-20">
//                   <Typewriter
//                     options={{
//                       strings: ["Showcase your goods", "Connect with buyers"],
//                       autoStart: true,
//                       loop: true,
//                       delay: 100,
//                       deleteSpeed: 10,
//                     }}
//                   />
//                 </div>
//                 <div className="flex justify-center text-xs font-medium text-customOrange -translate-y-20">
//                   <Typewriter
//                     options={{
//                       strings: [
//                         "and make OWO!",
//                         "and make KUDI!",
//                         "and make EGO!",
//                       ],
//                       autoStart: true,
//                       loop: true,
//                       delay: 50,
//                       deleteSpeed: 30,
//                     }}
//                   />
//                 </div>
//                 <div className="-translate-y-7">
//                   <div className="mb-2">
//                     <h1 className="font-ubuntu text-5xl flex font-semibold text-black">
//                       Login{" "}
//                       <span className="text-customOrange translate-y-4 text-xl">
//                         <p>(Vendor)</p>
//                       </span>
//                     </h1>
//                   </div>
//                   <p className="text-black font-semibold">
//                     Please sign in to continue
//                   </p>
//                   <Form className="mt-4" onSubmit={signIn}>
//                     <FormGroup className="relative">
//                       <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
//                         <MdEmail className="text-gray-500 text-xl" />
//                       </div>
//                       <input
//                         type="email"
//                         placeholder="Enter your email"
//                         value={email}
//                         className="w-full h-14 text-gray-800 pl-10 rounded-full bg-gray-300"
//                         onChange={(e) => setEmail(e.target.value)}
//                       />
//                     </FormGroup>
//                     <FormGroup className="relative">
//                       <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
//                         <GrSecure className="text-gray-500 text-xl" />
//                       </div>
//                       <input
//                         type={showPassword ? "text" : "password"}
//                         placeholder="Enter your password"
//                         value={password}
//                         className="w-full h-14 text-gray-800 pl-10 rounded-full bg-gray-300"
//                         onChange={(e) => setPassword(e.target.value)}
//                       />
//                       <div
//                         className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
//                         onClick={() => setShowPassword(!showPassword)}
//                       >
//                         {showPassword ? (
//                           <FaRegEyeSlash className="text-gray-500 text-xl" />
//                         ) : (
//                           <FaRegEye className="text-gray-500 text-xl" />
//                         )}
//                       </div>
//                     </FormGroup>
//                     <div className="flex justify-end font-semibold">
//                       <p className="text-black underline text-xs">
//                         <Link to="">Forgot password?</Link>
//                       </p>
//                     </div>

//                     <motion.button
//                       whileTap={{ scale: 1.2 }}
//                       type="submit"
//                       className="w-full h-14 bg-customOrange text-white font-semibold rounded-full mt-4"
//                     >
//                       Login
//                     </motion.button>
//                     <div className="text-center font-light mt-2 flex justify-center">
//                       <p className="text-gray-700">
//                         Want to join our community?{" "}
//                         <span className="font-semibold underline text-black">
//                           <Link to="">Sign Up</Link>
//                         </span>
//                       </p>
//                     </div>
//                   </Form>
//                 </div>
//               </div>
//             )}
//           </Row>
//         </Container>
//       </section>
//     </Helmet>
//   );
// };

// export default AdminLogin;
