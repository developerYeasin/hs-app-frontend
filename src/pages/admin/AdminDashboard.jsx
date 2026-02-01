"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/components/auth/SessionContextProvider.jsx';

const AdminDashboard = () => {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return <div className="text-center py-8">Loading user data...</div>;
  }

  if (!user) {
    return <div className="text-center py-8 text-red-500">Access Denied. Please log in.</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-3xl">Admin Control Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg">Welcome, {user.email}!</p>
        <p>Use the sidebar to navigate and configure your HubSpot integration.</p>
        <p>Here you can add new cards and associate buttons with them.</p>
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;