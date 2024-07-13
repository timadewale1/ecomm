import React, { useState } from 'react';

const Product = () => {
  const [productImgCover, setProductImgCover] = useState(null);
  const [additionalImg1, setAdditionalImg1] = useState(null);
  const [additionalImg2, setAdditionalImg2] = useState(null);
  const [productName, setProductName] = useState('');
  const [productSize, setProductSize] = useState({ type: 'UK', size: '' });
  const [category, setCategory] = useState({ type: 'Men', subcategory: '' });

  const handleFileChange = (e, setImage) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <div className="product-form-container">
      <form onSubmit={handleSubmit}>
        <div>
          <label>Product Image Cover:</label>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setProductImgCover)} required />
        </div>
        <div>
          <label>Additional Image 1:</label>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setAdditionalImg1)} />
        </div>
        <div>
          <label>Additional Image 2:</label>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setAdditionalImg2)} />
        </div>
        <div>
          <label>Product Name:</label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} required />
        </div>
        <div>
          <label>Product Size:</label>
          <select value={productSize.type} onChange={(e) => setProductSize({ ...productSize, type: e.target.value })} required>
            <option value="UK">UK</option>
            <option value="US">US</option>
          </select>
          <select value={productSize.size} onChange={(e) => setProductSize({ ...productSize, size: e.target.value })} required>
            {productSize.type === 'UK' ? (
              <>
                <option value="6">UK 6</option>
                <option value="8">UK 8</option>
                <option value="10">UK 10</option>
                <option value="12">UK 12</option>
              </>
            ) : (
              <>
                <option value="6">US 6</option>
                <option value="8">US 8</option>
                <option value="10">US 10</option>
                <option value="12">US 12</option>
              </>
            )}
          </select>
        </div>
        <div>
          <label>Category:</label>
          <select value={category.type} onChange={(e) => setCategory({ ...category, type: e.target.value })} required>
            <option value="Men">Men</option>
            <option value="Women">Women</option>
            <option value="Kids">Kids</option>
          </select>
          <select value={category.subcategory} onChange={(e) => setCategory({ ...category, subcategory: e.target.value })} required>
            {category.type === 'Men' && (
              <>
                <option value="Casual">Casual</option>
                <option value="Formal">Formal</option>
                <option value="Trad">Trad</option>
              </>
            )}
            {category.type === 'Women' && (
              <>
                <option value="Casual">Casual</option>
                <option value="Formal">Formal</option>
                <option value="Trad">Trad</option>
              </>
            )}
            {category.type === 'Kids' && (
              <>
                <option value="Casual">Casual</option>
                <option value="Formal">Formal</option>
                <option value="Trad">Trad</option>
              </>
            )}
          </select>
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default Product;
