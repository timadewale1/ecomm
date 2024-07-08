import React from "react";
import { useLocation } from "react-router-dom";
import Routers from "../../routers/Routers";
import BottomBar from "../BottomBar/BottomBar";

const Layout = () => {
  const location = useLocation();

  // List of paths where BottomBar should not be rendered
  const noBottomBarPaths = ["/login", "/signup", "/forgetpassword"];

  // Check if the current path is in the list
  const hideBottomBar = noBottomBarPaths.includes(location.pathname);

  return (
    <>
      <div>
        <Routers />
      </div>
      {!hideBottomBar && <BottomBar />}
    </>
  );
};

export default Layout;
