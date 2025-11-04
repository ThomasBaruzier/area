import "./App.css";

import React from "react";
import { Route, Routes } from "react-router-dom";

import AdminRoute from "./auth/AdminRoute";
import { AuthProvider } from "./auth/AuthProvider";
import { ConnectionsProvider } from "./auth/ConnectionsProvider";
import ProtectedRoute from "./auth/ProtectedRoutes";
import Header from "./components/Header";
import { MetadataProvider } from "./context/MetadataProvider";
import { WorkflowsProvider } from "./context/WorkflowsProvider";
import AboutPage from "./pages/AboutPage";
import AdminUsers from "./pages/AdminUsers";
import AuthCallback from "./pages/AuthCallback";
import CreateWorkflow from "./pages/CreateWorkflow";
import HomePage from "./pages/HomePage";
import ServiceListPage from "./pages/ServiceList";
import UserLoginPage from "./pages/UserLogin";
import UserRegisterPage from "./pages/UserRegister";
import WorkflowListPage from "./pages/WorkflowList";

function App(): JSX.Element {
  return (
    <AuthProvider>
      <ConnectionsProvider>
        <MetadataProvider>
          <WorkflowsProvider>
            <Header />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<UserLoginPage />} />
                <Route path="/register" element={<UserRegisterPage />} />
                <Route path="/about.json" element={<AboutPage />} />
                <Route path="/oauth-callback" element={<AuthCallback />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/services" element={<ServiceListPage />} />
                  <Route path="/workflow/list" element={<WorkflowListPage />} />
                  <Route path="/workflow/create" element={<CreateWorkflow />} />
                  <Route
                    path="/workflow/edit/:id"
                    element={<CreateWorkflow />}
                  />
                </Route>
                <Route element={<AdminRoute />}>
                  <Route path="/admin/users" element={<AdminUsers />} />
                </Route>
              </Routes>
            </main>
          </WorkflowsProvider>
        </MetadataProvider>
      </ConnectionsProvider>
    </AuthProvider>
  );
}

export default App;
