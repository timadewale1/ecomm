import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { GoDotFill, GoChevronLeft } from "react-icons/go";
import { FiSearch } from "react-icons/fi";
import { db } from "../firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';
import ReactStars from "react-rating-stars-component";
import RoundedStar from "../components/Roundedstar";
import ProductCard from "../components/Products/ProductCard";

const OnlineVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState({ vendorResults: [], productResults: [] });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendorsAndProducts = async () => {
      try {
        const vendorQuery = query(collection(db, "vendors"), where("marketPlaceType", "==", "virtual"));
        const vendorSnapshot = await getDocs(vendorQuery);
        const vendorsList = vendorSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setVendors(vendorsList);

        // Fetch products for each vendor
        const productsList = [];
        for (const vendor of vendorsList) {
          const productsRef = collection(db, `vendors/${vendor.id}/products`);
          const productsSnapshot = await getDocs(productsRef);
          productsSnapshot.forEach(productDoc => {
            productsList.push({ id: productDoc.id, vendorId: vendor.id, ...productDoc.data() });
          });
        }

        setProducts(productsList);
      } catch (error) {
        toast.error("Error fetching vendors and products: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorsAndProducts();
  }, []);

  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    if (term.length < 2 && selectedCategories.length === 0) {
      setSearchResults({ vendorResults: [], productResults: [] });
    } else {
      const vendorResults = vendors.filter(vendor => 
        vendor.shopName.toLowerCase().includes(term) &&
        (selectedCategories.length === 0 || selectedCategories.some(category => vendor.categories.includes(category)))
      );
      const productResults = products.filter(product => 
        product.name.toLowerCase().includes(term) &&
        (selectedCategories.length === 0 || selectedCategories.some(category => product.categories.includes(category)))
      );
      setSearchResults({ vendorResults, productResults });
    }
  };

  const handleCategoryClick = (category) => {
    const updatedCategories = selectedCategories.includes(category) 
      ? selectedCategories.filter(cat => cat !== category) 
      : [...selectedCategories, category];

    setSelectedCategories(updatedCategories);

    if (searchTerm.length < 2 && updatedCategories.length === 0) {
      setSearchResults({ vendorResults: [], productResults: [] });
    } else {
      const vendorResults = vendors.filter(vendor => 
        vendor.shopName.toLowerCase().includes(searchTerm) &&
        (updatedCategories.length === 0 || updatedCategories.some(category => vendor.categories.includes(category)))
      );
      const productResults = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) &&
        (updatedCategories.length === 0 || updatedCategories.some(category => product.categories.includes(category)))
      );
      setSearchResults({ vendorResults, productResults });
    }
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setIsSearching(false);
    setSearchResults({ vendorResults: [], productResults: [] });
  };

  const handleStoreView = (vendor) => {
    navigate(`/store/${vendor.id}`);
  };

  const defaultImageUrl = "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  return (
    <div className="p-2 mb-20">
      <div className="sticky-header flex flex-col items-center -mx-2 p-2 bg-white shadow">
        <div className="flex justify-between items-center w-full">
          {isSearching ? (
            <>
              <button onClick={handleRefresh} className="text-gray-600">
                <GoChevronLeft size={28} />
              </button>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search..."
                className="border rounded-lg px-3 py-2 flex-1 mx-2"
              />
            </>
          ) : (
            <>
              <button onClick={() => navigate(-1)} className="text-gray-500">
                <GoChevronLeft size={32} />
              </button>
              <h1 className="font-ubuntu text-lg font-medium">ONLINE VENDORS</h1>
              <button onClick={() => setIsSearching(true)} className="text-gray-500">
                <FiSearch size={30} />
              </button>
            </>
          )}
        </div>
        <div className="flex mt-4 space-x-3 overflow-x-auto scrollbar-hide">
          {["Cargos", "Shirts", "Jewelry"].map(category => (
            <button
              key={category}
              className={`px-4 py-2 rounded-full ${selectedCategories.includes(category) ? 'bg-orange-500 text-white' : 'bg-transparent text-black border'}`}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="vendor-list -mx-2 translate-y-1">
        <hr className="bg-gray-200 pb-0.5 w-full" />
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="vendor-item my-">
              <div className="flex justify-between p-3 mb-1 bg-white shadow">
                <div>
                  <h1 className="font-poppins text-black text-2xl font-medium"><Skeleton width={150} /></h1>
                  <p className="font-sans text-gray-300 categories-text flex items-center -translate-y-1">
                    <Skeleton width={100} />
                  </p>
                  <div className="flex items-center translate-y-4">
                    <Skeleton width={50} height={24} />
                    <Skeleton width={100} height={24} className="ml-2" />
                  </div>
                </div>
                <div>
                  <Skeleton height={96} width={96} />
                </div>
              </div>
            </div>
          ))
        ) : searchTerm.length < 2 && selectedCategories.length === 0 ? (
          vendors.map((vendor) => (
            <div key={vendor.id} className="vendor-item my-">
              <div className="flex justify-between p-3 mb-1 bg-white shadow" onClick={() => handleStoreView(vendor)}>
                <div>
                  <h1 className="font-poppins text-black text-2xl font-medium">
                    {vendor.shopName}
                  </h1>
                  <p className="font-sans text-gray-300 categories-text flex items-center -translate-y-1">
                    {vendor.categories.slice(0, 4).map((category, index) => (
                      <React.Fragment key={index}>
                        {index > 0 && <GoDotFill className="mx-1 dot-size text-gray-300" />}
                        {category}
                      </React.Fragment>
                    ))}
                  </p>
                  <div className="flex items-center translate-y-4">
                    <span className="text-black font-light text-xs mr-2">{((vendor.rating / vendor.ratingCount) || 0).toFixed(1)}</span>
                    <ReactStars
                      count={5}
                      value={(vendor.rating / vendor.ratingCount) || 0}
                      size={24}
                      activeColor="#ffd700"
                      emptyIcon={<RoundedStar filled={false} />}
                      filledIcon={<RoundedStar filled={true} />}
                      edit={false} // Make the stars display-only
                    />
                    <span className="text-black font-light ratings-text ml-2">({vendor.ratingCount || 0})</span>
                  </div>
                </div>

                <div>
                  <img
                    className="object-cover h-24 w-24 rounded-lg"
                    src={vendor.coverImageUrl || defaultImageUrl}
                    alt={vendor.shopName}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            {searchResults.vendorResults.length === 0 && searchResults.productResults.length === 0 ? (
              <div className="text-center my-10">
                <h2 className="text-2xl font-ubuntu font-medium">No results found</h2>
                <p className="text-gray-600">Please try searching for another item or category.</p>
              </div>
            ) : (
              <>
                {searchResults.vendorResults.map((vendor) => (
                  <div key={vendor.id} className="vendor-item my-">
                    <div className="flex justify-between p-3 mb-1 bg-white shadow" onClick={() => handleStoreView(vendor)}>
                      <div>
                        <h1 className="font-poppins text-black text-2xl font-medium">
                          {vendor.shopName}
                        </h1>
                        <p className="font-sans text-gray-300 categories-text flex items-center -translate-y-1">
                          {vendor.categories.slice(0, 4).map((category, index) => (
                            <React.Fragment key={index}>
                              {index > 0 && <GoDotFill className="mx-1 dot-size text-gray-300" />}
                              {category}
                            </React.Fragment>
                          ))}
                        </p>
                        <div className="flex items-center translate-y-4">
                          <span className="text-black font-light text-xs mr-2">{((vendor.rating / vendor.ratingCount) || 0).toFixed(1)}</span>
                          <ReactStars
                            count={5}
                            value={(vendor.rating / vendor.ratingCount) || 0}
                            size={24}
                            activeColor="#ffd700"
                            emptyIcon={<RoundedStar filled={false} />}
                            filledIcon={<RoundedStar filled={true} />}
                            edit={false} // Make the stars display-only
                          />
                          <span className="text-black font-light ratings-text ml-2">({vendor.ratingCount || 0})</span>
                        </div>
                      </div>

                      <div>
                        <img
                          className="object-cover h-24 w-24 rounded-lg"
                          src={vendor.coverImageUrl || defaultImageUrl}
                          alt={vendor.shopName}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {searchResults.productResults.map((product) => {
                  const vendor = vendors.find(vendor => vendor.id === product.vendorId);
                  return (
                    <ProductCard key={product.id} product={product} vendorName={vendor?.shopName} />
                  );
                })}
              </>
            )}
          </>
        )}
        <hr className="bg-gray-100 pb-0.5 w-full" />
      </div>
    </div>
  );
};

export default OnlineVendors;
