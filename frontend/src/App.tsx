import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';

// Lazy load all pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ResendVerification = lazy(() => import('./pages/ResendVerification'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const Cases = lazy(() => import('./pages/Cases'));
const Deadlines = lazy(() => import('./pages/Deadlines'));
const Updates = lazy(() => import('./pages/Updates'));
const Financial = lazy(() => import('./pages/Financial'));
const Documents = lazy(() => import('./pages/Documents'));
const Schedule = lazy(() => import('./pages/Schedule'));
const ToDo = lazy(() => import('./pages/ToDo'));
const AccountsPayable = lazy(() => import('./pages/AccountsPayable'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const SMTPSettings = lazy(() => import('./pages/SMTPSettings'));
const AIConfig = lazy(() => import('./pages/AIConfig'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const Users = lazy(() => import('./pages/Users'));
const Companies = lazy(() => import('./pages/Companies'));
const LegalDocuments = lazy(() => import('./pages/LegalDocuments'));
const Hearings = lazy(() => import('./pages/Hearings'));
const Subscription = lazy(() => import('./pages/Subscription'));
const SubscriptionAlerts = lazy(() => import('./pages/SubscriptionAlerts'));
const StripeConfig = lazy(() => import('./pages/StripeConfig'));
const ClientSubscriptions = lazy(() => import('./pages/ClientSubscriptions'));
const Embed = lazy(() => import('./pages/Embed'));

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-neutral-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p className="mt-4 text-neutral-600">Carregando...</p>
    </div>
  </div>
);

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return token ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/resend-verification" element={<ResendVerification />} />
          {/* Embed route for Chatwell integration - auto-login */}
          <Route path="/embed/:token/*" element={<Embed />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/hearings"
            element={
              <PrivateRoute>
                <Hearings />
              </PrivateRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <PrivateRoute>
                <Clients />
              </PrivateRoute>
            }
          />
          <Route
            path="/cases"
            element={
              <PrivateRoute>
                <Cases />
              </PrivateRoute>
            }
          />
          <Route
            path="/deadlines"
            element={
              <PrivateRoute>
                <Deadlines />
              </PrivateRoute>
            }
          />
          <Route
            path="/updates"
            element={
              <PrivateRoute>
                <Updates />
              </PrivateRoute>
            }
          />
          <Route
            path="/financial"
            element={
              <PrivateRoute>
                <Financial />
              </PrivateRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <PrivateRoute>
                <Documents />
              </PrivateRoute>
            }
          />
          <Route
            path="/legal-documents"
            element={
              <PrivateRoute>
                <LegalDocuments />
              </PrivateRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <PrivateRoute>
                <Schedule />
              </PrivateRoute>
            }
          />
          <Route
            path="/todos"
            element={
              <PrivateRoute>
                <ToDo />
              </PrivateRoute>
            }
          />
          <Route
            path="/accounts-payable"
            element={
              <PrivateRoute>
                <AccountsPayable />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/smtp-settings"
            element={
              <PrivateRoute>
                <SMTPSettings />
              </PrivateRoute>
            }
          />
          <Route
            path="/ai-config"
            element={
              <PrivateRoute>
                <AIConfig />
              </PrivateRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <PrivateRoute>
                <Campaigns />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute>
                <Users />
              </PrivateRoute>
            }
          />
          <Route
            path="/companies"
            element={
              <PrivateRoute>
                <Companies />
              </PrivateRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <PrivateRoute>
                <Subscription />
              </PrivateRoute>
            }
          />
          <Route
            path="/subscription-alerts"
            element={
              <PrivateRoute>
                <SubscriptionAlerts />
              </PrivateRoute>
            }
          />
          <Route
            path="/stripe-config"
            element={
              <PrivateRoute>
                <StripeConfig />
              </PrivateRoute>
            }
          />
          <Route
            path="/client-subscriptions"
            element={
              <PrivateRoute>
                <ClientSubscriptions />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
