import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";

import Loading from "../components/Loading/Loading";

import Waiting from "../components/Loading/Waiting";

const Explore = () => {
  const loading = useSelector((state) => state.product.loading);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-4">
      <Waiting />
      <h1 className="text-5xl -translate-y-60 font-opensans text-black ">
        WORK IN PROGRESS
      </h1>
    </div>
  );
};

export default Explore;
