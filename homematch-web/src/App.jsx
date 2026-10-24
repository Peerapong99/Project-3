import {lazy, Suspense} from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// =========================
// AUTHENTICATION
// =========================

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

// Forgot / Reset Password
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// =========================
// PROTECTED ROUTE
// =========================

import ProtectedRoute from "./Components/ProtectedRoute";

// =========================
// ADMIN
// =========================

const AdminDashboard = lazy(() => import('./Components/Admin/AdminDashboard'));

// =========================
// SELLER
// =========================

const SellerDashboard = lazy(() => import('./Components/Seller/SellerDashboard'));
const AddProperty = lazy(() => import('./Components/Seller/AddProperty'));
const EditProperty = lazy(() => import('./Components/Seller/EditProperty'));

// =========================
// PURCHASE OFFERS (NEW)
// =========================

const PurchaseOffers = lazy(() => import('./Components/Seller/PurchaseOffers'));
const SubscriptionManagement = lazy(() => import('./Components/Admin/SubscriptionManagement'));
const SubscriptionPlans = lazy(() => import('./Components/Seller/SubscriptionPlans'));
const MySubscription = lazy(() => import('./Components/Seller/MySubscription'));
const SubscriptionCheckout = lazy(() => import('./Components/Seller/SubscriptionCheckout'));

// =========================
// APP
// =========================

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div role="status" className="flex min-h-screen items-center justify-center">กำลังโหลด...</div>}>
      <Routes>
        <Route path="/admin/subscriptions" element={<ProtectedRoute allowedRoles={["admin"]}><SubscriptionManagement/></ProtectedRoute>}/>
        <Route path="/seller/subscription/plans" element={<ProtectedRoute allowedRoles={["seller"]}><SubscriptionPlans/></ProtectedRoute>}/>
        <Route path="/seller/subscription" element={<ProtectedRoute allowedRoles={["seller"]}><MySubscription/></ProtectedRoute>}/>
        <Route path="/seller/subscription/checkout/:paymentId" element={<ProtectedRoute allowedRoles={["seller"]}><SubscriptionCheckout/></ProtectedRoute>}/>

        {/* =========================
            DEFAULT ROUTE
        ========================= */}

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* =========================
            AUTHENTICATION
        ========================= */}

        {/* Login */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Register */}
        <Route
          path="/register"
          element={<Register />}
        />

        {/* Forgot Password */}
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* Reset Password */}
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* =========================
            ADMIN
        ========================= */}

        {/* Admin Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* =========================
            SELLER
        ========================= */}

        {/* Seller Dashboard */}
        <Route
          path="/seller/dashboard"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <SellerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Add Property */}
        <Route
          path="/seller/add-property"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <AddProperty />
            </ProtectedRoute>
          }
        />

        {/* Edit Property */}
        <Route
          path="/seller/edit-property/:id"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <EditProperty />
            </ProtectedRoute>
          }
        />

        {/* =========================
            PURCHASE OFFERS (NEW)
        ========================= */}

        {/* Seller Manage Purchase Offers */}
        <Route
          path="/seller/offers"
          element={
            <ProtectedRoute allowedRoles={["seller"]}>
              <PurchaseOffers />
            </ProtectedRoute>
          }
        />

        {/* =========================
            NOT FOUND
        ========================= */}

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;


