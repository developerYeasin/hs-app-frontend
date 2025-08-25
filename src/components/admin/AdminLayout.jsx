"use client";

import React from 'react';
import AdminSidebar from './AdminSidebar';
import { Outlet } from 'react-router-dom';
import Header from '@/components/Layout/Header'; // Import the Header component

const AdminLayout = () => {
  return (
    <div className="flex flex-col h-screen"> {/* Main container for header + content */}
      <Header /> {/* The header at the very top */}
      <div className="flex flex-1"> {/* This div will contain sidebar and main content, taking remaining height */}
        <AdminSidebar />
        <div className="flex-1 p-6 overflow-auto">
          <Outlet /> {/* This is where nested admin routes will render */}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;