import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";
import ProductCard from "../../components/Products/ProductCard";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';
import { toast } from "react-toastify";
import { GoChevronLeft } from "react-icons/go";
import { FiSearch } from "react-icons/fi"; // Import search icon

const CategoryPage = () => {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
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
              productsList.push({ id: productDoc.id, vendorId: vendorId, ...productData });
            }
          });
        }
        
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
      setIsSticky(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getCategoryStyles = (category) => { 
    switch (category) {
      case 'Men':
        return { headerImage: 'url(/public/womenhead.jpeg)', text: 'Discover the Latest Men\'s Fashion' };
      case 'Women':
        return { headerImage: 'url(/path/to/women-fashion.jpg)', text: 'Explore the Latest Women\'s Fashion' };
      case 'Kids':
        return { headerImage: 'url(/path/to/kids-fashion.jpg)', text: 'Adorable Kids Collection for All Ages' };
      default:
        return { headerImage: '', text: '' };
    }
  };

  const { headerImage, text: headerText } = getCategoryStyles(category);

  return (
    <div className="category-page mb-14">
      {/* Header Section */}
      <div 
        className={`relative h-56 flex items-end justify-center bg-cover bg-center`}
        style={{ backgroundImage: headerImage }}
      >
        {/* Back button */}
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-4 left-4 p-2 bg-white rounded-full shadow"
        >
          <GoChevronLeft size={24} />
        </button>

        {/* Search Button */}
        <button className="absolute top-4 right-4 p-2 bg-white rounded-full shadow">
          <FiSearch size={24} />
        </button>

        {/* Header Text */}
        <div className="text-center p-4">
          <p className="text-xl font-semibold text-white">{headerText}</p>
        </div>
      </div>

      {/* Top Vendors Section */}
      <div className="p-3">
        <h2 className="text-lg font-semibold mb-2">Top Vendors</h2>
        <div className="flex gap-4 overflow-x-auto">
          {/* Example of Vendor Cards */}
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="min-w-[150px]">
              <img src="vendor-image-url" alt="Vendor" className="w-full h-24 object-cover rounded" />
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm">Vendor Name</span>
                <button className="px-2 py-1 text-sm bg-transparent-500 text-white rounded">+ Follow</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Grid */}
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
