"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CustomLoginForm from '@/components/auth/CustomLoginForm.jsx'; // Import the new component

const Login = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
      <Card className="w-full max-w-md p-4">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Login to Admin Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomLoginForm /> {/* Use the custom login form */}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;