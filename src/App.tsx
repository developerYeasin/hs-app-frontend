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
import Login from "./pages/Login";
import SignUp from "./pages/SignUp"; // Import SignUp page
import AdminDashboard from "./pages/admin/AdminDashboard";
import { SessionContextProvider, useSession } from "./components/auth/SessionContextProvider";

const queryClient = new QueryClient();

// ProtectedRoute component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
                <Route path="/signup" element={<SignUp />} /> {/* Add SignUp route */}
                {/* Protected Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                  <Route path="dashboard" element={<AdminDashboard />} />
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