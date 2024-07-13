// import React from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { getAuth, signOut } from "firebase/auth";

// const Navbar = () => {
//   const navigate = useNavigate();
//   const auth = getAuth();

//   const handleLogout = async () => {
//     await signOut(auth);
//     navigate("/vendorlogin");
//   };

//   return (
//     <nav>
//       <ul>
//         <li>
//           <Link to="/vendordashboard">Dashboard</Link>
//         </li>
//         <li>{/* <Link to="/vendor/inputproducts">Add Products</Link> */}</li>
//         <li>{/* <Link to="/vendor/allproducts">All Products</Link> */}</li>
//         <li>
//           <button onClick={handleLogout}>Logout</button>
//         </li>
//       </ul>
//     </nav>
//   );
// };

// export default Navbar;
