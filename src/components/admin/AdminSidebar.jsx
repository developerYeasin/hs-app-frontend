"use client";

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, CreditCard, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminSidebar = () => {
  const location = useLocation();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
      name: 'Add Card',
      path: '/admin/add-card',
      icon: <CreditCard className="mr-2 h-4 w-4" />,
    },
    {
      name: 'Add Button to Card',
      path: '/admin/add-button-to-card',
      icon: <PlusCircle className="mr-2 h-4 w-4" />,
    },
  ];

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground p-4 border-r border-sidebar-border h-full">
      <nav className="space-y-2">
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
            <Link to={item.path}>
              {item.icon}
              {item.name}
            </Link>
          </Button>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;