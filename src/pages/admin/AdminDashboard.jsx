"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/components/auth/SessionContextProvider.jsx';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client.js';
import { useNavigate } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/toast';

const AdminDashboard = () => {
  const { user, isLoading } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError('Logout failed: ' + error.message);
    } else {
      showSuccess('Logged out successfully!');
      navigate('/login');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading user data...</div>;
  }

  if (!user) {
    return <div className="text-center py-8 text-red-500">Access Denied. Please log in.</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-center text-3xl">Admin Control Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg">Welcome, {user.email}!</p>
        <p>This is where you will configure buttons for your HubSpot clients.</p>
        <Button onClick={handleLogout} variant="destructive">
          Logout
        </Button>
        {/* Button configuration UI will go here */}
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;