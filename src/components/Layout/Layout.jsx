"use client";

import React from 'react';
import { Outlet } from 'react-router-dom'; // Import Outlet
import Header from './Header';
import Footer from './Footer';

const Layout = () => { // No need for 'children' prop when using Outlet
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto p-4">
        <Outlet /> {/* Render the nested route components here */}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;