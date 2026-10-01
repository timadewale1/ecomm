import React, { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { setAuthRouteLoading } from "../../services/authTransition.mjs";
import Loading from "../Loading/Loading";

export function AuthRoutePending() {
  useLayoutEffect(() => { setAuthRouteLoading(true); }, []);
  return <Loading />;
}
export function AuthRouteReady() {
  const location = useLocation();
  useLayoutEffect(() => { setAuthRouteLoading(false); }, [location.key]);
  return null;
}
