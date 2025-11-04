import React from "react";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "./useAuth";

const ProtectedRoute = (): JSX.Element => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
