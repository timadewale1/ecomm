import React, { useState } from "react";
import { Container, Row, Col, Form, FormGroup } from "reactstrap";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { db, storage } from "../firebase.config";
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const AddProducts = () => {
  const [enterTitle, setEnterTitle] = useState("");
  const [enterShortDesc, setEnterShortDesc] = useState("");
  const [enterDescription, setEnterDescription] = useState("");
  const [enterCategory, setEnterCategory] = useState("");
  const [enterSubCategory, setEnterSubCategory] = useState("");
  const [enterPrice, setEnterPrice] = useState("");
  const [enterProductImg, setEnterProductImg] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const addProduct = async (e) => {
    e.preventDefault();
    setLoading(true);

    // adding productss to the firebase
    try {
      const docRef = await collection(db, "products");

      const storageRef = ref(
        storage,
        `productImages/${Date.now() + enterProductImg.name}`
      );
      const uploadTask = uploadBytes(storageRef, enterProductImg);
      await uploadTask;

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Add product to Firestore
      await addDoc(docRef, {
        productName: enterTitle,
        shortDesc: enterShortDesc,
        description: enterDescription,
        category: enterCategory,
        subCategory: enterSubCategory,
        price: enterPrice,
        imgUrl: downloadURL,
      });

      setLoading(false);
      toast.success("Product succesfully added!");
      navigate("/dashboard/all-products");
    } catch (err) {
      setLoading(false);
      toast.error("Product not added");
    }
  };
  return (
    <section>
      <Container>
        <Row>
          <Col lg="12">
            <h4 className="mb-4">Add Product</h4>
            {loading ? (
              <h4 className="py-5">Loading...</h4>
            ) : (
              <>
                <Form onSubmit={addProduct}>
                  <div className=" align-items-center justify-content-between gap-5">
                    <FormGroup className="form__group w-50">
                      <span>Product name</span>
                      <input
                        type="text"
                        placeholder="Double sofa"
                        value={enterTitle}
                        onChange={(e) => setEnterTitle(e.target.value)}
                        required
                      />
                    </FormGroup>
                    <FormGroup className="form__group w-50">
                      <span>Short Description</span>
                      <input
                        type="text"
                        placeholder="lorem......"
                        value={enterShortDesc}
                        onChange={(e) => setEnterShortDesc(e.target.value)}
                        required
                      />
                    </FormGroup>
                    <FormGroup className="form__group w-50">
                      <span>Description</span>
                      <input
                        type="text"
                        placeholder="Description"
                        value={enterDescription}
                        onChange={(e) => setEnterDescription(e.target.value)}
                        required
                      />
                    </FormGroup>
                  </div>
                  <div className=" align-items-center justify-content-between gap-5">
                    <FormGroup className="form__group w-50">
                      <span>Price</span>
                      <input
                        type="number"
                        placeholder="$100"
                        value={enterPrice}
                        onChange={(e) => setEnterPrice(e.target.value)}
                        required
                      />
                    </FormGroup>
                    <FormGroup className="form__group w-50">
                      <span>Category</span>
                      <select
                        className="w-100 p-2"
                        value={enterCategory}
                        onChange={(e) => setEnterCategory(e.target.value)}
                        required
                      >
                        <option>select category</option>
                        <option value="chair">Chair</option>
                        <option value="sofa">Sofa</option>
                        <option value="mobile">Mobile</option>
                        <option value="watch">Watch</option>
                        <option value="wireless">Wireless</option>
                      </select>
                    </FormGroup>
                    <FormGroup className="form__group w-50">
                      <span> Sub Category</span>
                      <select
                        className="w-100 p-2"
                        value={enterSubCategory}
                        onChange={(e) => setEnterSubCategory(e.target.value)}
                        required
                      >
                        <option>select subcategory</option>
                        <option value="trending">Trending</option>
                        <option value="popular">popular</option>
                        <option value="bestsales">bestsales</option>
                      </select>
                    </FormGroup>
                  </div>
                  <div>
                    <FormGroup className="form__group w-50">
                      <span>Product Image</span>
                      <input
                        type="file"
                        onChange={(e) => setEnterProductImg(e.target.files[0])}
                        required
                      />
                    </FormGroup>
                  </div>
                  <motion.button
                    whileTap={{ scale: 1.2 }}
                    type="submit"
                    className="buy__btn"
                  >
                    Add Product
                  </motion.button>
                </Form>
              </>
            )}
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default AddProducts;
