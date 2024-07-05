import React from "react";
import Productcard from "./ProductCard";

const ProductList = ({ data }) => {
  return (
    <>
      {data?.map((item, index) => (
        <Productcard item={item} key={index} />
      ))}
    </>
  );
};
export default ProductList;
