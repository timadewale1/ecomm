// Header.jsx
import React from "react";
import { GoChevronLeft } from "react-icons/go";
import { FiSearch } from "react-icons/fi";

const Header = ({ title, isSearching, setIsSearching, searchTerm, handleSearchChange, navigate }) => {
  return (
    <div className="sticky-header flex flex-col items-center -mx-2 p-2 bg-white shadow">
      <div className="flex justify-between items-center w-full">
        {isSearching ? (
          <>
            <button onClick={() => setIsSearching(false)} className="text-gray-600">
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
            <h1 className="font-ubuntu text-lg font-medium">{title}</h1>
            <button onClick={() => setIsSearching(true)} className="text-gray-500">
              <FiSearch size={30} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Header;
