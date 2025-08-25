"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CustomSignUpForm from '@/components/auth/CustomSignUpForm.jsx'; // Import the new component

const SignUp = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
      <Card className="w-full max-w-md p-4">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Create an Account</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomSignUpForm /> {/* Use the custom sign-up form */}
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUp;