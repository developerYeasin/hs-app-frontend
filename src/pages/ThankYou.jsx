"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const ThankYou = () => {
  // The logic for saving user info is now handled by the oauth-callback-hubspot Edge Function.
  // This page now serves as a static confirmation or can be removed if not needed.

  return (
    <Card className="w-full max-w-md mx-auto mt-8 text-center">
      <CardHeader>
        <CardTitle className="text-4xl font-bold text-green-600 flex items-center justify-center gap-2">
          <CheckCircle size={48} /> Thank You!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg text-gray-700">
          Thank you for installing our app and connecting it to your HubSpot account.
        </p>
        <p className="text-md text-gray-600">
          We appreciate your trust and are excited for you to explore the enhanced features.
        </p>
        <p className="text-sm text-muted-foreground">
          Your information has been processed securely. You can now view your contacts.
        </p>
      </CardContent>
    </Card>
  );
};

export default ThankYou;