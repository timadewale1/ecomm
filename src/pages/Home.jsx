// import React, { useState, useEffect } from "react";

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Col } from "reactstrap";
import heroImg from "../assets/images/hero-img.png";
import Services from "../services/Services";
import "../styles/home.css";
import ProductList from "../components/UI/ProductList";
import { useEffect, useState } from "react";

import useGetData from "../custom-hooks/useGetData";

const Home = () => {
  const { data: products, loading } = useGetData("products");

  const [trendingProducts, setTrendingProducts] = useState([]);
  const [bestSalesProducts, setBestSalesProducts] = useState([]);
  const [mobileProducts, setMobileProducts] = useState([]);
  const [wirelessProducts, setWirelessProducts] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);

  const year = new Date().getFullYear();

  useEffect(() => {
    const filteredTrendingProducts = products.filter(
      (item) => item.subCategory === "trending"
    );

    const filteredMobileProducts = products.filter(
      (item) => item.category === "mobile"
    );
    const filteredWirelessProducts = products.filter(
      (item) => item.category === "wireless"
    );
    const filteredBestSalesProducts = products.filter(
      (item) => item.subCategory === "bestsales"
    );

    const filteredPopularProducts = products.filter(
      (item) => item.subCategory === "popular"
    );

    setTrendingProducts(filteredTrendingProducts);
    setBestSalesProducts(filteredBestSalesProducts);
    setMobileProducts(filteredMobileProducts);
    setWirelessProducts(filteredWirelessProducts);
    setPopularProducts(filteredPopularProducts);
  }, [products]);

  return (
    <Helmet title={"Home"}>
      <section className="hero__section">
        <Container>
          <Row>
            <Col lg="6" md="6">
              <div className="hero__content">
                <p className="hero__subtitle">Trending Product in {year}</p>
                <h2>Make your blah blah blah more Minimalist & modern</h2>
                <p>
                  Lorem, ipsum dolor sit amet consectetur adipisicing elit. Quia
                  tenetur, cupiditate magni mollitia beatae sapiente molestias
                  laborum voluptatem, ducimus aliquid illo tempora temporibus
                  error commodi ab repellat possimus aut reiciendis.
                </p>
                <motion.button whileTap={{ scale: 1.2 }} className="buy__btn">
                  <Link to="/shop">SHOP NOW</Link>{" "}
                </motion.button>
              </div>
            </Col>
            <Col lg="6" md="6">
              <div className="hero__img">
                <img src={heroImg} alt="" />
              </div>
            </Col>
          </Row>
        </Container>
      </section>
      <Services />
      <section className="trending__products">
        <Container>
          <Row>
            <Col lg="12" className="text-center">
              <h2 className="section__title">Trending Products</h2>
            </Col>
            {loading ? (
              <h5 className="fw-bold">Loading...</h5>
            ) : (
              <ProductList data={trendingProducts} />
            )}
          </Row>
        </Container>
      </section>

      <section className="best__sales">
        <Container>
          <Row>
            <Col lg="12" className="text-center">
              <h2 className="section__title">Best Sales</h2>
            </Col>
            {loading ? (
              <h5 className="fw-bold">Loading...</h5>
            ) : (
              <ProductList data={bestSalesProducts} />
            )}
          </Row>
        </Container>
      </section>
      <section className="new__arrivals mb-5">
        <Container>
          <Row>
            <Col lg="12" className="text-center mb-5">
              <h2 className="section__title">New Arrivals</h2>
            </Col>
            {loading ? (
              <h5 className="fw-bold">Loading...</h5>
            ) : (
              <ProductList data={mobileProducts} />
            )}
            {loading ? (
              <h5 className="fw-bold">Loading...</h5>
            ) : (
              <ProductList data={wirelessProducts} />
            )}
          </Row>
        </Container>
      </section>

      <section className="popular__category">
        <Container>
          <Row>
            <Col lg="12" className="text-center">
              <h2 className="section__title">Popular Products</h2>
            </Col>
            {loading ? (
              <h5 className="fw-bold">Loading...</h5>
            ) : (
              <ProductList data={popularProducts} />
            )}
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default Home;
