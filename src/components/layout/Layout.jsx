import React from "react";
import { useLocation } from "react-router-dom";
import Routers from "../../routers/Routers";
import BottomBar from "../BottomBar/BottomBar";
import useAuth from "../../custom-hooks/useAuth";

const Layout = () => {
  const location = useLocation();
  const { currentUser } = useAuth(); // Custom hook to get the current user

  // List of paths where BottomBar should not be rendered
  const noBottomBarPaths = ["/login", "/signup", "/forgetpassword", "/admin", "/confirm-user-state"];

  const hideBottomBar = noBottomBarPaths.includes(location.pathname) || !currentUser;

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
