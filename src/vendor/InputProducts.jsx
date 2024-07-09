// import React, { useState, useEffect } from "react";
// import { Container, Row, Col, Form, FormGroup } from "reactstrap";
// import { motion } from "framer-motion";
// import { toast } from "react-toastify";
// import { db, storage, auth } from "../firebase.config";
// import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
// import { collection, addDoc } from "firebase/firestore";

// const InputProducts = () => {
//   const [title, setTitle] = useState("");
//   const [shortDesc, setShortDesc] = useState("");
//   const [description, setDescription] = useState("");
//   const [category, setCategory] = useState("");
//   const [subCategory, setSubCategory] = useState("");
//   const [price, setPrice] = useState("");
//   const [productImg, setProductImg] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [preventRedirect, setPreventRedirect] = useState(true); // Prevent redirection

//   useEffect(() => {
//     // Prevent any redirection on page load
//     const blockRedirection = () => {
//       if (preventRedirect) {
//         window.history.pushState({}, "", window.location.href);
//         window.onpopstate = () => {
//           window.history.pushState({}, "", window.location.href);
//         };
//       }
//     };

//     blockRedirection();

//     // Check if vendor is authenticated
//     const checkAuth = async () => {
//       try {
//         const vendor = auth.currentUser;
//         if (!vendor) throw new Error("Vendor not authenticated");

//         // Additional logic if needed
//       } catch (error) {
//         console.error("Authentication error:", error.message);
//         toast.error("Authentication error: " + error.message);
//       }
//     };

//     checkAuth();

//     return () => {
//       // Cleanup the redirection block on component unmount
//       window.onpopstate = null;
//     };
//   }, [preventRedirect]);

//   const handleAddProduct = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       // Get the current vendor's ID
//       const vendor = auth.currentUser;
//       if (!vendor) throw new Error("Vendor not authenticated");
//       const vendorId = vendor.uid;

//       // Ensure productImg is set
//       if (!productImg) {
//         throw new Error("Product image not selected");
//       }

//       // Upload the image to Firebase Storage
//       const imageRef = ref(
//         storage,
//         `productImages/${Date.now()}_${productImg.name}`
//       );
//       const uploadTask = uploadBytesResumable(imageRef, productImg);

//       uploadTask.on(
//         "state_changed",
//         (snapshot) => {},
//         (error) => {
//           setLoading(false);
//           console.error("Image upload failed:", error.message);
//           toast.error("Image upload failed: " + error.message);
//         },
//         async () => {
//           const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

//           // Add product details to Firestore under the vendor's subcollection
//           const productData = {
//             title,
//             shortDesc,
//             description,
//             category,
//             subCategory,
//             price,
//             imgUrl: downloadURL,
//           };

//           await addDoc(
//             collection(db, `vendors/${vendorId}/products`),
//             productData
//           );

//           setLoading(false);
//           toast.success("Product successfully added!");
//           // Prevent redirection by conditionally blocking navigation
//           if (!preventRedirect) {
//             // navigate("/dashboard/all-products");  // Commented out to prevent redirection
//           }
//         }
//       );
//     } catch (error) {
//       setLoading(false);
//       console.error("Failed to add product:", error.message);
//       toast.error("Failed to add product: " + error.message);
//     }
//   };

//   return (
//     <section>
//       <Container>
//         <Row>
//           <Col lg="12">
//             <h4 className="mb-4">Add Product</h4>
//             {loading ? (
//               <h4 className="py-5">Loading...</h4>
//             ) : (
//               <Form onSubmit={handleAddProduct}>
//                 <div className="align-items-center justify-content-between gap-5">
//                   <FormGroup className="form__group w-50">
//                     <span>Product name</span>
//                     <input
//                       type="text"
//                       placeholder="Product name"
//                       value={title}
//                       onChange={(e) => setTitle(e.target.value)}
//                       required
//                     />
//                   </FormGroup>
//                   <FormGroup className="form__group w-50">
//                     <span>Short Description</span>
//                     <input
//                       type="text"
//                       placeholder="Short description"
//                       value={shortDesc}
//                       onChange={(e) => setShortDesc(e.target.value)}
//                       required
//                     />
//                   </FormGroup>
//                   <FormGroup className="form__group w-50">
//                     <span>Description</span>
//                     <textarea
//                       placeholder="Description"
//                       value={description}
//                       onChange={(e) => setDescription(e.target.value)}
//                       required
//                     ></textarea>
//                   </FormGroup>
//                 </div>
//                 <div className="align-items-center justify-content-between gap-5">
//                   <FormGroup className="form__group w-50">
//                     <span>Price</span>
//                     <input
//                       type="number"
//                       placeholder="Price"
//                       value={price}
//                       onChange={(e) => setPrice(e.target.value)}
//                       required
//                     />
//                   </FormGroup>
//                   <FormGroup className="form__group w-50">
//                     <span>Category</span>
//                     <select
//                       className="w-100 p-2"
//                       value={category}
//                       onChange={(e) => setCategory(e.target.value)}
//                       required
//                     >
//                       <option value="">Select category</option>
//                       <option value="chair">Chair</option>
//                       <option value="sofa">Sofa</option>
//                       <option value="mobile">Mobile</option>
//                       <option value="watch">Watch</option>
//                       <option value="wireless">Wireless</option>
//                     </select>
//                   </FormGroup>
//                   <FormGroup className="form__group w-50">
//                     <span>Sub Category</span>
//                     <select
//                       className="w-100 p-2"
//                       value={subCategory}
//                       onChange={(e) => setSubCategory(e.target.value)}
//                       required
//                     >
//                       <option value="">Select subcategory</option>
//                       <option value="trending">Trending</option>
//                       <option value="popular">Popular</option>
//                       <option value="bestsales">Best Sales</option>
//                     </select>
//                   </FormGroup>
//                 </div>
//                 <FormGroup className="form__group w-50">
//                   <span>Product Image</span>
//                   <input
//                     type="file"
//                     onChange={(e) => setProductImg(e.target.files[0])}
//                     required
//                   />
//                 </FormGroup>
//                 <motion.button
//                   whileTap={{ scale: 1.2 }}
//                   type="submit"
//                   className="buy__btn"
//                 >
//                   Add Product
//                 </motion.button>
//               </Form>
//             )}
//           </Col>
//         </Row>
//       </Container>
//     </section>
//   );
// };

// export default InputProducts;
