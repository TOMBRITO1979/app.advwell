import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

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
const Leads = lazy(() => import('./pages/Leads'));
const Subscription = lazy(() => import('./pages/Subscription'));
const SubscriptionAlerts = lazy(() => import('./pages/SubscriptionAlerts'));
const StripeConfig = lazy(() => import('./pages/StripeConfig'));
const ClientSubscriptions = lazy(() => import('./pages/ClientSubscriptions'));
const Embed = lazy(() => import('./pages/Embed'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfUse = lazy(() => import('./pages/TermsOfUse'));
const MyData = lazy(() => import('./pages/MyData'));
const LGPDRequests = lazy(() => import('./pages/LGPDRequests'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const BackupSettings = lazy(() => import('./pages/BackupSettings'));
const Announcements = lazy(() => import('./pages/Announcements'));

// Portal pages
const PortalDashboard = lazy(() => import('./portal/pages/PortalDashboard'));
const PortalCases = lazy(() => import('./portal/pages/PortalCases'));
const PortalCaseDetails = lazy(() => import('./portal/pages/PortalCaseDetails'));
const PortalProfile = lazy(() => import('./portal/pages/PortalProfile'));
const PortalCompany = lazy(() => import('./portal/pages/PortalCompany'));
const PortalAnnouncements = lazy(() => import('./portal/pages/PortalAnnouncements'));

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-neutral-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p className="mt-4 text-neutral-600">Carregando...</p>
    </div>
  </div>
);

// Check if we're on the portal domain
const isPortalDomain = () => {
  return window.location.hostname === 'cliente.advwell.pro';
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  // Redirect CLIENT users to portal
  if (user?.role === 'CLIENT') {
    return <Navigate to="/portal" />;
  }

  return <>{children}</>;
};

// Route for portal pages - only accessible by CLIENT users
const PortalRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  // Only CLIENT users can access portal
  // If on portal domain but not CLIENT, redirect to login (they shouldn't be here)
  if (user?.role !== 'CLIENT') {
    if (isPortalDomain()) {
      return <Navigate to="/login" />;
    }
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

// Root redirect component - handles domain-based routing
const RootRedirect = () => {
  const { token, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If on portal domain, always redirect to /portal
  if (isPortalDomain()) {
    return <Navigate to="/portal" />;
  }

  // If logged in as CLIENT, go to portal
  if (token && user?.role === 'CLIENT') {
    return <Navigate to="/portal" />;
  }

  // Otherwise go to dashboard
  return <Navigate to="/dashboard" />;
};

function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <ErrorBoundary>
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
          {/* Public LGPD pages */}
          <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
          <Route path="/termos-de-uso" element={<TermsOfUse />} />
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
            path="/leads"
            element={
              <PrivateRoute>
                <Leads />
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
            path="/meus-dados"
            element={
              <PrivateRoute>
                <MyData />
              </PrivateRoute>
            }
          />
          <Route
            path="/lgpd-requests"
            element={
              <PrivateRoute>
                <LGPDRequests />
              </PrivateRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <PrivateRoute>
                <AuditLogs />
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
            path="/backup-settings"
            element={
              <PrivateRoute>
                <BackupSettings />
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
          <Route
            path="/announcements"
            element={
              <PrivateRoute>
                <Announcements />
              </PrivateRoute>
            }
          />
          {/* Portal routes for CLIENT users */}
          <Route
            path="/portal"
            element={
              <PortalRoute>
                <PortalDashboard />
              </PortalRoute>
            }
          />
          <Route
            path="/portal/cases"
            element={
              <PortalRoute>
                <PortalCases />
              </PortalRoute>
            }
          />
          <Route
            path="/portal/cases/:id"
            element={
              <PortalRoute>
                <PortalCaseDetails />
              </PortalRoute>
            }
          />
          <Route
            path="/portal/profile"
            element={
              <PortalRoute>
                <PortalProfile />
              </PortalRoute>
            }
          />
          <Route
            path="/portal/company"
            element={
              <PortalRoute>
                <PortalCompany />
              </PortalRoute>
            }
          />
          <Route
            path="/portal/announcements"
            element={
              <PortalRoute>
                <PortalAnnouncements />
              </PortalRoute>
            }
          />
          <Route path="/" element={<RootRedirect />} />
          {/* Catch-all route for 404 */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </ErrorBoundary>
  );
}

export default App;
