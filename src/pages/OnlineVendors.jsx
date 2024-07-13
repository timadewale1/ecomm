// import React, { useState, useEffect } from "react";
// import { useNavigate } from 'react-router-dom';
// import { GoDotFill, GoChevronLeft } from "react-icons/go";
// import { FiSearch } from "react-icons/fi";
// import ReactStars from "react-rating-stars-component";
// import RoundedStar from "../components/Roundedstar";
// import * as fuzzySearch from '@m31coding/fuzzy-search';
// import { db } from "../firebase.config"; 
// import { collection, query, where, getDocs } from "firebase/firestore";

// const OnlineVendors = () => {
//   const [vendors, setVendors] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [isSearching, setIsSearching] = useState(false);
//   const [selectedCategories, setSelectedCategories] = useState([]);
//   const [searcher, setSearcher] = useState(null);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const fetchVendors = async () => {
//       const q = query(collection(db, "vendors"), where("marketPlaceType", "==", "virtual"));
//       const querySnapshot = await getDocs(q);
//       const vendorsList = [];
//       querySnapshot.forEach((doc) => {
//         vendorsList.push({ id: doc.id, ...doc.data() });
//       });
//       setVendors(vendorsList);

//       // Create fuzzy search index
//       const searcher = fuzzySearch.SearcherFactory.createDefaultSearcher();
//       searcher.indexEntities(
//         vendorsList,
//         (vendor) => vendor.id,
//         (vendor) => [vendor.shopName.toLowerCase(), ...vendor.categories.map(cat => cat.toLowerCase())]
//       );
//       setSearcher(searcher);
//     };
//     fetchVendors();
//   }, []);

//   const handleSearchChange = (e) => {
//     setSearchTerm(e.target.value.toLowerCase());
//   };

//   const handleCategoryClick = (category) => {
//     if (selectedCategories.includes(category)) {
//       setSelectedCategories(selectedCategories.filter(cat => cat !== category));
//     } else if (selectedCategories.length < 4) {
//       setSelectedCategories([...selectedCategories, category]);
//     }
//   };

//   const handleRefresh = () => {
//     setSearchTerm("");
//     setSelectedCategories([]);
//     setIsSearching(false);
//   };

//   const categories = ["Cargos", "Shirts", "Jewelry"];

//   const filteredVendors = vendors.filter(vendor => {
//     const searchMatches = searchTerm.length < 2 || searcher.getMatches(new fuzzySearch.Query(searchTerm)).matches.map(match => match.entity.id).includes(vendor.id);
//     const categoryMatches = selectedCategories.length === 0 || selectedCategories.every(cat => vendor.categories.map(c => c.toLowerCase()).includes(cat.toLowerCase()));
//     return searchMatches && categoryMatches;
//   });

//   const showNoResultsMessage = searchTerm.length >= 2 && filteredVendors.length === 0;

//   const handleStoreView = (vendor) => {
//     navigate(`/store/${vendor.id}`);
//     console.log (`clicked on store with id ${vendor.id}`)
//   }

//   return (
//     <div className="p-2" >
//       <div className="sticky-header flex flex-col items-center -mx-2 p-2 bg-white shadow">
//         <div className="flex justify-between items-center w-full">
//           {isSearching ? (
//             <>
//               <button onClick={handleRefresh} className="text-gray-600">
//                 <GoChevronLeft size={28} />
//               </button>
//               <input
//                 type="text"
//                 value={searchTerm}
//                 onChange={(e) => handleSearchChange(e)}
//                 placeholder="Search..."
//                 className="border rounded-lg px-3 py-2 flex-1 mx-2"
//               />
//             </>
//           ) : (
//             <>
//               <button onClick={() => navigate(-1)} className="text-gray-500">
//                 <GoChevronLeft size={32} />
//               </button>
//               <h1 className="font-ubuntu text-lg font-medium">ONLINE VENDORS</h1>
//               <button onClick={() => setIsSearching(true)} className="text-gray-500">
//                 <FiSearch size={30} />
//               </button>
//             </>
//           )}
//         </div>
//         <div className="flex mt-4 space-x-3 overflow-x-auto scrollbar-hide">
//           {categories.map(category => (
//             <button
//               key={category}
//               className={`px-4 py-2 rounded-full ${selectedCategories.includes(category) ? 'bg-orange-500 text-white' : 'bg-transparent text-black border '}`}
//               onClick={() => handleCategoryClick(category)}
//             >
//               {category}
//             </button>
//           ))}
//         </div>
//       </div>

//       <div className="vendor-list -mx-2 translate-y-1">
//         <hr className="bg-gray-200 pb-0.5 w-full" />
//         {showNoResultsMessage ? (
//           <div className="text-center my-10">
//             <h2 className="text-2xl font-ubuntu font-medium">Oops, not in our inventory</h2>
//             <p className="text-gray-600">Please try searching for another item.</p>
//           </div>
//         ) : (
//           filteredVendors.length > 0 ? (
//             filteredVendors.map((vendor) => (
//               <div key={vendor.id} className="vendor-item my-">
//                 <div className="flex justify-between p-3 mb-1 bg-white shadow" onClick={() => handleStoreView(vendor)}>
//                   <div>
//                     <h1 className="font-poppins text-black text-2xl font-medium">
//                       {vendor.shopName}
//                     </h1>
//                     <p className="font-sans text-gray-300 categories-text flex items-center -translate-y-1">
//                       {vendor.categories.slice(0, 4).map((category, index) => (
//                         <React.Fragment key={index}>
//                           {index > 0 && <GoDotFill className="mx-1 dot-size text-gray-300" />}
//                           {category}
//                         </React.Fragment>
//                       ))}
//                     </p>
//                     <div className="flex items-center translate-y-4">
//                       <span className="text-black font-light text-xs mr-2">{(vendor.rating || 0).toFixed(1)}</span>
//                       <ReactStars
//                         count={5}
//                         value={vendor.rating || 0}
//                         size={24}
//                         activeColor="#ffd700"
//                         emptyIcon={<RoundedStar filled={false} />}
//                         filledIcon={<RoundedStar filled={true} />}
//                         edit={false} // Make the stars display-only
//                       />
//                       <span className="text-black font-light ratings-text ml-2">({vendor.ratingCount || 0})</span>
//                     </div>
//                   </div>

//                   <div>
//                     <img
//                       className="object-cover h-24 w-24 rounded-lg"
//                       src={vendor.coverImageUrl}
//                       alt={vendor.shopName}
//                     />
//                   </div>
//                 </div>
//               </div>
//             ))
//           ) : (
//             vendors.map((vendor) => (
//               <div key={vendor.id} className="vendor-item my-">
//                 <div className="flex justify-between p-3 mb-1 bg-white shadow">
//                   <div>
//                     <h1 className="font-poppins text-black text-2xl font-medium">
//                       {vendor.shopName}
//                     </h1>
//                     <p className="font-sans text-gray-300 categories-text flex items-center -translate-y-1">
//                       {vendor.categories.slice(0, 4).map((category, index) => (
//                         <React.Fragment key={index}>
//                           {index > 0 && <GoDotFill className="mx-1 dot-size text-gray-300" />}
//                           {category}
//                         </React.Fragment>
//                       ))}
//                     </p>
//                     <div className="flex items-center translate-y-4">
//                       <span className="text-black font-light text-xs mr-2">{(vendor.rating || 0).toFixed(1)}</span>
//                       <ReactStars
//                         count={5}
//                         value={vendor.rating || 0}
//                         size={24}
//                         activeColor="#ffd700"
//                         emptyIcon={<RoundedStar filled={false} />}
//                         filledIcon={<RoundedStar filled={true} />}
//                         edit={false} // Make the stars display-only
//                       />
//                       <span className="text-black font-light ratings-text ml-2">({vendor.ratingCount || 0})</span>
//                     </div>
//                   </div>

//                   <div>
//                     <img
//                       className="object-cover h-24 w-24 rounded-lg"
//                       src={vendor.coverImageUrl}
//                       alt={vendor.shopName}
//                     />
//                   </div>
//                 </div>
//               </div>
//             ))
//           )
//         )}
//         <hr className="bg-gray-100 pb-0.5 w-full" />
//       </div>
//     </div>
//   );
// };

// export default OnlineVendors;


import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { GoDotFill, GoChevronLeft } from "react-icons/go";
import { FiSearch } from "react-icons/fi";
import ReactStars from "react-rating-stars-component";
import RoundedStar from "../components/Roundedstar";

const OnlineVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Dummy vendors data
    const dummyVendors = [
      {
        id: "1",
        shopName: "Dummy Shop 1",
        coverImageUrl: "https://via.placeholder.com/100",
        rating: 4.5,
        ratingCount: 20,
        categories: ["Cargos", "Shirts"],
      },
      {
        id: "2",
        shopName: "Dummy Shop 2",
        coverImageUrl: "https://via.placeholder.com/100",
        rating: 3.8,
        ratingCount: 10,
        categories: ["Jewelry"],
      },
      {
        id: "3",
        shopName: "Dummy Shop 3",
        coverImageUrl: "https://via.placeholder.com/100",
        rating: 4.9,
        ratingCount: 50,
        categories: ["Cargos", "Jewelry"],
      },
    ];

    setVendors(dummyVendors);
  }, []);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const handleCategoryClick = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(cat => cat !== category));
    } else if (selectedCategories.length < 4) {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setIsSearching(false);
  };

  const categories = ["Cargos", "Shirts", "Jewelry"];

  const filteredVendors = vendors.filter(vendor => {
    const searchMatches = searchTerm.length < 2 || vendor.shopName.toLowerCase().includes(searchTerm);
    const categoryMatches = selectedCategories.length === 0 || selectedCategories.every(cat => vendor.categories.includes(cat));
    return searchMatches && categoryMatches;
  });

  const showNoResultsMessage = searchTerm.length >= 2 && filteredVendors.length === 0;

  const handleStoreView = (vendor) => {
    navigate(`/store/${vendor.id}`);
    console.log(`clicked on store with id ${vendor.id}`);
  };

  return (
    <div className="p-2">
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
                onChange={(e) => handleSearchChange(e)}
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
          {categories.map(category => (
            <button
              key={category}
              className={`px-4 py-2 rounded-full ${selectedCategories.includes(category) ? 'bg-orange-500 text-white' : 'bg-transparent text-black border '}`}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="vendor-list -mx-2 translate-y-1">
        <hr className="bg-gray-200 pb-0.5 w-full" />
        {showNoResultsMessage ? (
          <div className="text-center my-10">
            <h2 className="text-2xl font-ubuntu font-medium">Oops, not in our inventory</h2>
            <p className="text-gray-600">Please try searching for another item.</p>
          </div>
        ) : (
          filteredVendors.length > 0 ? (
            filteredVendors.map((vendor) => (
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
                      <span className="text-black font-light text-xs mr-2">{(vendor.rating || 0).toFixed(1)}</span>
                      <ReactStars
                        count={5}
                        value={vendor.rating || 0}
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
                      src={vendor.coverImageUrl}
                      alt={vendor.shopName}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
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
                      <span className="text-black font-light text-xs mr-2">{(vendor.rating || 0).toFixed(1)}</span>
                      <ReactStars
                        count={5}
                        value={vendor.rating || 0}
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
                      src={vendor.coverImageUrl}
                      alt={vendor.shopName}
                    />
                  </div>
                </div>
              </div>
            ))
          )
        )}
        <hr className="bg-gray-100 pb-0.5 w-full" />
      </div>
    </div>
  );
};

export default OnlineVendors;
