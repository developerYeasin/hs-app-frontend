import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import Index from "./pages/Index";
import Contacts from "./pages/Contacts";
import ThankYou from "./pages/ThankYou";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login.jsx";
import SignUp from "./pages/SignUp.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AddCard from "./pages/admin/AddCard.jsx"; // Import new admin page
import AddButtonToCard from "./pages/admin/AddButtonToCard.jsx"; // Import new admin page
import AdminLayout from "./components/admin/AdminLayout.jsx"; // Import new admin layout
import { SessionContextProvider, useSession } from "./components/auth/SessionContextProvider.jsx";

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
        <Sonner />
        <BrowserRouter>
          <SessionContextProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/thank-you" element={<ThankYou />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                {/* Protected Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<AdminDashboard />} /> {/* Default admin route */}
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="add-card" element={<AddCard />} />
                  <Route path="add-button-to-card" element={<AddButtonToCard />} />
                  {/* Add other admin routes here */}
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </SessionContextProvider>
        </BrowserRouter>
      </>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;