"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/auth/SessionContextProvider";
// Removed supabase, useNavigate, showError, showSuccess imports as they are no longer needed here

const Header = () => {
  const { user } = useSession();
  // Removed useNavigate, handleLogout as they are no longer needed here

  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          HubSpot App
        </Link>
        <nav>
          <ul className="flex space-x-4 items-center">
            <li>
              <Button variant="ghost" asChild>
                <Link to="/">Install App</Link>
              </Button>
            </li>
            <li>
              <Button variant="ghost" asChild>
                <Link to="/contacts">Contacts</Link>
              </Button>
            </li>
            {user ? (
              <>
                <li>
                  <Button variant="ghost" asChild>
                    <Link to="/admin/dashboard">Admin</Link>
                  </Button>
                </li>
                {/* Logout button moved to AdminSidebar */}
              </>
            ) : (
              <li>
                {/* Changed to a direct Link with button styling for troubleshooting */}
                <Link 
                  to="/login" 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                >
                  Login
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;