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
// import Contacts from "./pages/Contacts"; // Moved to admin routes
import ThankYou from "./pages/ThankYou";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login.jsx";
import SignUp from "./pages/SignUp.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import ManageCards from "./pages/admin/ManageCards.jsx";
import ManageButtons from "./pages/admin/ManageButtons.jsx";
import AdminLayout from "./components/admin/AdminLayout.jsx";
import AdminContacts from "./pages/admin/AdminContacts.jsx"; // New import for admin contacts
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
        <Sonner position="top-center" /> {/* Added position="top-center" here */}
        <BrowserRouter>
          <SessionContextProvider>
            <Routes>
              {/* Routes that use the main Header and Footer */}
              <Route path="/" element={<Layout />}>
                <Route path="/" element={<Index />} />
                {/* <Route path="/contacts" element={<Contacts />} /> Moved to admin */}
                <Route path="/thank-you" element={<ThankYou />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="*" element={<NotFound />} />{" "}
                {/* NotFound also uses the main layout */}
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
                <Route path="contacts" element={<AdminContacts />} /> {/* New admin contacts route */}
              </Route>
            </Routes>
          </SessionContextProvider>
        </BrowserRouter>
      </>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;