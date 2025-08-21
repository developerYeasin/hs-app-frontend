"use client";

import React from 'react';
import { useLocation } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const ThankYou = () => {
  const location = useLocation();

  React.useEffect(() => {
    const saveUserInfo = async () => {
      const params = new URLSearchParams(location.search);
      const accessToken = params.get('accessToken') || 'placeholder_access_token';
      const sessionID = params.get('sessionID') || 'placeholder_session_id';
      const contacts = 'some_contact_info_from_hubspot';

      try {
        const response = await fetch('https://txfsspgkakryggiodgic.supabase.co/functions/v1/add-client', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contacts: contacts,
            accessToken: accessToken,
            sessionID: sessionID,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save user info.');
        }

        const result = await response.json();
        showSuccess('Thank you! Your information has been saved.');
        console.log('User info saved:', result);
      } catch (error) {
        showError(`Failed to save user info: ${error.message}`);
        console.error('Error saving user info:', error);
      }
    };

    saveUserInfo();
  }, [location.search]);

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
          Your information is being processed securely.
        </p>
      </CardContent>
    </Card>
  );
};

export default ThankYou;