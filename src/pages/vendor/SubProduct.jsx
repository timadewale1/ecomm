import React, { useState, useRef } from "react";
import { FiPlus } from "react-icons/fi";
import { GoChevronLeft, GoTrash } from "react-icons/go";
import Select from "react-select";
import { BiSolidImageAdd } from "react-icons/bi";
import { TiCameraOutline } from "react-icons/ti";
import toast from "react-hot-toast";

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const MAX_SUB_PRODUCTS = 4;

const SubProduct = ({
  availableSizes,
  addSubProduct,
  closeModal,
  initialSubProducts = [],
}) => {
  const [subProducts, setSubProducts] = useState(
    initialSubProducts.length > 0
      ? initialSubProducts
      : [
          {
            subProductId: Math.random().toString(36).substr(2, 9),
            images: [],
            size: "",
            color: "",
            stock: "",
          },
        ]
  );
  const scrollContainerRef = useRef(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleFileChange = (index, event) => {
    const files = Array.from(event.target.files);
    const updatedSubProducts = [...subProducts];

    // Validate each file's size
    const validFiles = [];
    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.dismiss();
        toast.error(`${file.name} exceeds the maximum file size of 3MB`, {
          duration: 3000,
        });
      } else {
        validFiles.push(file);
      }
    });

    // Check the number of images
    if (validFiles.length + updatedSubProducts[index].images.length > 2) {
      toast.dismiss();
      toast.error("You can upload a maximum of 2 images", { duration: 3000 });
      return;
    }

    updatedSubProducts[index].images = [
      ...updatedSubProducts[index].images,
      ...validFiles,
    ];

    setSubProducts(updatedSubProducts);
  };

  const handleRemoveImage = (subIndex, imageIndex) => {
    const updatedSubProducts = [...subProducts];
    updatedSubProducts[subIndex].images.splice(imageIndex, 1);
    setSubProducts(updatedSubProducts);
  };

  const handleRemoveSubProduct = (subIndex) => {
    const updatedSubProducts = subProducts.filter(
      (_, index) => index !== subIndex
    );
    setSubProducts(updatedSubProducts);
    toast.dismiss(); // Dismiss existing toasts
    toast.success("Sub-product removed successfully", { duration: 3000 });
  };

  const handleInputChange = (subIndex, field, value) => {
    const updatedSubProducts = [...subProducts];
    updatedSubProducts[subIndex][field] = value;
    setSubProducts(updatedSubProducts);
  };

  const handleAddAnotherSubProduct = () => {
    if (subProducts.length >= MAX_SUB_PRODUCTS) {
      toast.error("You can only add up to 4 sub-products", { duration: 3000 });
      return;
    }
    setSubProducts([
      ...subProducts,
      {
        subProductId: Math.random().toString(36).substr(2, 9),
        images: [],
        size: "",
        color: "",
        stock: "",
      },
    ]);
  };

  const handleProceed = () => {
    addSubProduct(subProducts);
    closeModal();
  };

  const handleScroll = () => {
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const scrollWidth = scrollContainerRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / scrollWidth);
    setCurrentImageIndex(newIndex);
  };

  const handleDotClick = (index) => {
    setCurrentImageIndex(index);
    const scrollWidth = scrollContainerRef.current.offsetWidth;
    scrollContainerRef.current.scrollTo({
      left: scrollWidth * index,
      behavior: "smooth",
    });
  };

  const isSubProductValid = (subProduct) => {
    return (
      subProduct.images.length > 0 &&
      subProduct.size !== "" &&
      subProduct.color !== "" &&
      subProduct.stock > 0
    );
  };

  const allSubProductsValid = subProducts.every(isSubProductValid);

  return (
    <div className="fixed inset-0 bg-white z-50 -mx-3 overflow-y-auto flex flex-col">
      {/* Modal Header */}
      <div className="relative flex items-center justify-center p-4">
        <button className="absolute left-4 text-black" onClick={closeModal}>
          <GoChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-opensans font-semibold">Sub-product</h2>
      </div>

      <div className="p-4 flex-grow">
        {subProducts.map((subProduct, subIndex) => (
          <div key={subIndex} className="mb-6 relative">
            {/* Add Trash Icon to Delete Sub-Product (but hide for the first sub-product) */}
            {subIndex > 0 && (
              <button
                className="absolute top-0 right-0 text-customBrown mb-2 p-2"
                onClick={() => handleRemoveSubProduct(subIndex)}
              >
                <GoTrash className="h-5 -translate-y-2 w-5" />
              </button>
            )}

            {/* Image Upload */}
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-2 font-opensans text-black flex items-center">
                <TiCameraOutline className="w-5 h-5 mr-2 text-xl text-black" />
                Upload Image
              </h3>
              <div className="flex flex-col items-center">
                <div
                  ref={scrollContainerRef}
                  className="relative w-full h-80 flex overflow-x-scroll snap-x snap-mandatory space-x-4"
                  style={{ scrollBehavior: "smooth" }}
                  onScroll={handleScroll}
                >
                  {subProduct.images.length > 0 ? (
                    subProduct.images.map((image, index) => (
                      <div
                        key={index}
                        className={`relative flex-shrink-0 w-full h-full border-2 border-dashed border-opacity-30  border-customBrown rounded-md snap-center ${
                          index === currentImageIndex
                            ? "opacity-100"
                            : "opacity-75"
                        } transition-opacity duration-300`}
                      >
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`SubProduct ${subIndex} Image ${index + 1}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 bg-customBrown text-white rounded-full p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(subIndex, index);
                          }}
                        >
                          <GoTrash className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div
                      className="w-full h-full border-2 border-dashed border-opacity-30  border-customBrown rounded-md flex items-center flex-col justify-center cursor-pointer"
                      onClick={() =>
                        document
                          .getElementById(`imageUpload-${subIndex}`)
                          .click()
                      }
                    >
                      <BiSolidImageAdd className="h-16 w-16 text-customOrange opacity-20" />
                      <h2 className="font-opensans px-10 text-center font-light text-xs text-customOrange opacity-90">
                        Upload product image here. Image must not be more than
                        3MB
                      </h2>
                    </div>
                  )}

                  <input
                    id={`imageUpload-${subIndex}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(subIndex, e)}
                    className="hidden"
                  />
                </div>

                {/* Carousel Dots (only shown when there are multiple images) */}
                {subProduct.images.length > 1 && (
                  <div className="flex justify-center mt-2">
                    {subProduct.images.map((_, index) => (
                      <div
                        key={index}
                        className={`cursor-pointer mx-0.5 rounded-full transition-all duration-300 ${
                          index === currentImageIndex
                            ? "bg-customOrange h-2.5 w-2.5"
                            : "bg-orange-300 h-2 w-2"
                        }`}
                        onClick={() => handleDotClick(index)}
                      />
                    ))}
                  </div>
                )}

                {/* Add another image button */}
                <div className="flex justify-end mt-2 w-full">
                  {subProduct.images.length < 2 && (
                    <button
                      onClick={() =>
                        document
                          .getElementById(`imageUpload-${subIndex}`)
                          .click()
                      }
                      className="flex items-center font-semibold justify-end text-customOrange"
                    >
                      <FiPlus className="text-xl" />
                      <span className="ml-1 font-opensans  text-sm">
                        Add Another Image
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Size */}
            <div className="mb-4">
              <label className="text-sm font-opensans font-medium text-black mb-1">
                Size
              </label>
              <Select
                options={availableSizes.map((size) => ({
                  label: size,
                  value: size,
                }))}
                value={{ label: subProduct.size, value: subProduct.size }}
                onChange={(selectedOption) =>
                  handleInputChange(subIndex, "size", selectedOption.value)
                }
                className="w-full"
                placeholder="Select Product Size"
                isSearchable
              />
            </div>

            {/* Color */}
            <div className="mb-4">
              <label className="font-opensans font-medium mb-1 text-sm text-black">
                Color
              </label>
              <input
                type="text"
                value={subProduct.color}
                onChange={(e) =>
                  handleInputChange(subIndex, "color", e.target.value)
                }
                className="w-full h-12 p-3 border-2 font-opensans text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
                placeholder=""
              />
            </div>

            <div className="mb-4">
              <label className="font-opensans  font-medium mb-1 text-sm text-black">
                Stock Quantity
              </label>
              <input
                type="number"
                value={subProduct.stock}
                onChange={(e) =>
                  handleInputChange(subIndex, "stock", e.target.value)
                }
                className="w-full h-12 p-3 border-2 font-opensans text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
                placeholder=""
              />
            </div>

            {/* Add Another */}
            {subIndex === subProducts.length - 1 && (
              <div className="flex justify-end">
                <button
                  className="text-customOrange text-sm flex border-customBrown border-1 rounded-full px-4 font-opensans h-12 items-center"
                  onClick={handleAddAnotherSubProduct}
                >
                  <FiPlus className="text-lg mr-1" />
                  Add another
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Proceed Button */}
      <div className="flex justify-center p-4 ">
        <button
          className={`px-4 h-12 w-full text-white rounded-full font-opensans ${
            allSubProductsValid ? "bg-customOrange" : "bg-orange-200"
          }`}
          onClick={handleProceed}
          disabled={!allSubProductsValid}
        >
          Proceed
        </button>
      </div>
    </div>
  );
};

export default SubProduct;
