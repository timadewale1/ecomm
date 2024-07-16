import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";
import ProductCard from "../../components/Products/ProductCard";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';
import { toast } from "react-toastify";
import { GoChevronLeft } from "react-icons/go";

const CategoryPage = () => {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log(`Fetching products for category: ${category}`);
        const vendorQuery = query(collection(db, "vendors"));
        const vendorSnapshot = await getDocs(vendorQuery);
        const productsList = [];
        
        for (const vendorDoc of vendorSnapshot.docs) {
          const vendorId = vendorDoc.id;
          const productsRef = collection(db, `vendors/${vendorId}/products`);
          const productsSnapshot = await getDocs(productsRef);
          productsSnapshot.forEach((productDoc) => {
            const productData = productDoc.data();
            if (productData.category.includes(category)) {
              console.log("Fetched product:", productData);
              productsList.push({ id: productDoc.id, vendorId: vendorId, ...productData });
            }
          });
        }
        
        console.log("Fetched products:", productsList);
        setProducts(productsList);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("Error fetching products: " + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [category]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getCategoryStyles = (category) => {
    switch (category) {
      case 'Mens':
        return { header: 'bg-black text-white', text: 'Discover the Latest Men\'s Fashion', font: 'font-sans' };
      case 'Women':
        return { header: 'bg-pink-500 text-white', text: 'Explore the Latest Women\'s Fashion', font: 'font-playfair' };
      case 'Kids':
        return { header: 'bg-[url(https://miro.medium.com/v2/resize:fit:1400/1*pzbYin_gqDNVjOSLQs06NQ.jpeg)] bg-cover text-white', text: 'Adorable Kids Collection for All Ages', font: 'font-poppins' };
      default:
        return { header: '', text: '', font: 'font-sans' };
    }
  };

  const { header: headerStyle, text: headerText, font: fontStyle } = getCategoryStyles(category);

  return (
    <div className="category-page mb-14">
      <div className={`sticky top-0 z-10 w-full flex items-center p-2 transition-all ${isSticky ? 'bg-opacity-50 bg-black' : ''}`}>
        <button onClick={() => navigate(-1)} className="p-1 bg-white rounded-full">
          <GoChevronLeft size={24} />
        </button>
      </div>
      <div className={`flex justify-center items-center h-20 ${headerStyle}`}>
        <div className="w-full text-center">
          <p className={`text-xs font-playwrite text-white ${fontStyle}`}>{headerText}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 p-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} height={200} width="100%" />
            ))
          : products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
      </div>
    </div>
  );
};

export default CategoryPage;
