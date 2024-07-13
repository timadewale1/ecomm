import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Loading from "../../components/Loading/Loading";

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dummy products data
    const dummyProducts = [
      {
        id: "p1",
        name: "Checkered Shirt",
        price: "1000",
        size: "M",
        imageUrl: "https://via.placeholder.com/150",
        condition: "defect",
        defectDescription: "Small tear on the sleeve",
        description: "This is a detailed description of the Checkered Shirt.",
      },
      {
        id: "p2",
        name: "Product 2",
        price: "2000",
        size: "L",
        imageUrl: "https://via.placeholder.com/150",
        condition: "brand new",
        description: "This is a detailed description of Product 2.",
      },
      {
        id: "p3",
        name: "Product 3",
        price: "3000",
        size: "S",
        imageUrl: "https://via.placeholder.com/150",
        condition: "thrift",
        description: "This is a detailed description of Product 3.",
      },
      // Add more products as needed
    ];

    const fetchedProduct = dummyProducts.find((product) => product.id === id);
    if (fetchedProduct) {
      setProduct(fetchedProduct);
    } else {
      console.log("No such product found!");
    }

    setLoading(false);
  }, [id]);

  if (loading) {
    return <Loading />;
  }

  if (!product) {
    return <div>No product found</div>;
  }

  return (
    <div className="">
      <img
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-64 object-cover rounded-md mb-2"
      />
      <div className="p-2">
      <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
      <p className="text-lg text-gray-700">₦{product.price}</p>
      <p className="mt-4">{product.description}</p>
      {/* Add more product details as needed */}
      </div>
      
     
    </div>
  );
};

export default ProductDetailPage;
