"use client";

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, CreditCard, List } from 'lucide-react'; // Changed PlusCircle to List
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
      name: 'Manage Cards', // Updated name
      path: '/admin/cards', // Updated path
      icon: <CreditCard className="mr-2 h-4 w-4" />,
    },
    {
      name: 'Manage Buttons', // Updated name
      path: '/admin/buttons', // Updated path
      icon: <List className="mr-2 h-4 w-4" />, // Updated icon
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