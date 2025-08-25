"use client";

import React from 'react';
import AdminSidebar from './AdminSidebar';
import { Outlet } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <div className="flex h-screen"> {/* Changed min-h-[calc(100vh-150px)] to h-screen */}
      <AdminSidebar />
      <div className="flex-1 p-6 overflow-auto">
        <Outlet /> {/* This is where nested admin routes will render */}
      </div>
    </div>
  );
};

export default AdminLayout;