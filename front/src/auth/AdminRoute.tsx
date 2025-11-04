import React from "react";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "./useAuth";

const AdminRoute = (): JSX.Element => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
