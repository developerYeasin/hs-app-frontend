"use client";

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, CreditCard, List, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from "@/components/auth/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

const AdminSidebar = () => {
  const location = useLocation();
  const { user } = useSession();
  const navigate = useNavigate();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
      name: 'Manage Cards',
      path: '/admin/cards',
      icon: <CreditCard className="mr-2 h-4 w-4" />,
    },
    {
      name: 'Manage Buttons',
      path: '/admin/buttons',
      icon: <List className="mr-2 h-4 w-4" />,
    },
  ];

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Logout failed: ' + error.message);
    } else {
      showSuccess('Logged out successfully!');
      navigate('/login');
    }
  };

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground p-4 border-r border-sidebar-border flex flex-col">
      <nav className="space-y-2 flex-grow">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className={cn(
              "w-full justify-start",
              location.pathname === item.path && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
            )}
            asChild
          >
            <Link to={item.path} className="flex items-center">
              {item.icon}
              {item.name}
            </Link>
          </Button>
        ))}
      </nav>
      {user && (
        <Button
          variant="ghost"
          className="w-full justify-start mt-auto flex items-center"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      )}
    </aside>
  );
};

export default AdminSidebar;