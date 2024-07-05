import React, { useState, useEffect } from "react";
import CommonSection from "../components/UI/CommonSection";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Col } from "reactstrap";
import "../styles/shop.css";
import ProductsLists from "../components/UI/ProductList";
import useGetData from "../custom-hooks/useGetData";

const Shop = () => {
  const { data: products, loading } = useGetData("products");

  const [productsData, setProductsData] = useState([]);

  const handleFilter = (e) => {
    const filterValue = e.target.value;

    if (filterValue === "sofa") {
      const filteredProducts = products.filter(
        (item) => item.category === "sofa"
      );
      setProductsData(filteredProducts);
    } else if (filterValue === "mobile") {
      const filteredProducts = products.filter(
        (item) => item.category === "mobile"
      );
      setProductsData(filteredProducts);
    } else if (filterValue === "chair") {
      const filteredProducts = products.filter(
        (item) => item.category === "chair"
      );
      setProductsData(filteredProducts);
    } else if (filterValue === "wireless") {
      const filteredProducts = products.filter(
        (item) => item.category === "wireless"
      );
      setProductsData(filteredProducts);
    } else if (filterValue === "all") {
      // If "All Products" is selected, show all products
      setProductsData(products);
    }
  };
  useEffect(() => {
    // Set productsData to all products when the component mounts
    setProductsData(products);
  }, [products]);

  const handleSearch = (e) => {
    const searchTerm = e.target.value;

    const searchedProducts = products.filter((item) =>
      item.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setProductsData(searchedProducts);
  };

  return (
    <Helmet title="Shop">
      <CommonSection title="Products">Products</CommonSection>

      <section>
        <Container>
          <Row>
            <Col lg="3" md="6">
              <div className="filter__widget">
                <select onChange={handleFilter}>
                  <option value="all">All Products</option>
                  <option value="sofa">sofa</option>
                  <option value="mobile">Mobile</option>
                  <option value="chair">Chair</option>
                  <option value="wireless">Wireless</option>
                </select>
              </div>
            </Col>
            {/* <Col lg="3" md="6" className="text-end">
              <div className="filter__widget">
                <select>
                  <option>Sort By</option>
                  <option value="ascending">Ascending</option>
                  <option value="descending">Descending</option>
                </select>
              </div>
            </Col> */}
            <Col lg="6" md="12">
              <div className="search__box">
                <input
                  type="text"
                  placeholder="Search....."
                  onChange={handleSearch}
                />
                <span>
                  <i class="ri-search-line"></i>
                </span>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="pt-0">
        <Container>
          <Row>
            {loading ? (
              <h5 className="fw-bold">Loading...</h5>
            ) : (
              <>
                {productsData.length === 0 ? (
                  <h1 className="text-center fs-4">No products are found!</h1>
                ) : (
                  <ProductsLists data={productsData} />
                )}
              </>
            )}
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default Shop;
