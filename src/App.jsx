import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout/Layout";
import Index from "./pages/Index";
import ThankYou from "./pages/ThankYou";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login.jsx";
import SignUp from "./pages/SignUp.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import ManageCards from "./pages/admin/ManageCards.jsx";
import ManageButtons from "./pages/admin/ManageButtons.jsx";
import AdminLayout from "./components/admin/AdminLayout.jsx";
import AdminContacts from "./pages/admin/AdminContacts.jsx";
import ClientAccounts from "./pages/admin/ClientAccounts.jsx"; // New import for ClientAccounts
import {
  SessionContextProvider,
  useSession,
} from "./components/auth/SessionContextProvider.jsx";

const queryClient = new QueryClient();

// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return <div>Loading authentication...</div>; // Or a spinner component
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <>
        <Toaster />
        <Sonner position="top-center" theme="light" />
        <BrowserRouter>
          <SessionContextProvider>
            <Routes>
              {/* Routes that use the main Header and Footer */}
              <Route path="/" element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/thank-you" element={<ThankYou />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Admin Routes that use AdminLayout (without main Header/Footer) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="cards" element={<ManageCards />} />
                <Route path="buttons" element={<ManageButtons />} />
                <Route path="contacts" element={<AdminContacts />} />
                <Route path="client-accounts" element={<ClientAccounts />} /> {/* New admin client accounts route */}
              </Route>
            </Routes>
          </SessionContextProvider>
        </BrowserRouter>
      </>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;