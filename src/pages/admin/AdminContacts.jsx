"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { supabase, supabaseAnonKey } from '@/integrations/supabase/client.js'; // Import supabaseAnonKey

const fetchContacts = async (clientId) => {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  let url = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/get-hubspot-contacts`;
  if (clientId) {
    url += `?client_id=${clientId}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey, // Add the Supabase anon key here
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch contacts');
  }
  return response.json();
};

const AdminContacts = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const clientId = params.get('client_id'); // Get client_id from URL

  // The query is always enabled, and the fetchContacts function will handle the client_id or user_id logic.
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['contacts', clientId],
    queryFn: () => fetchContacts(clientId),
  });

  React.useEffect(() => {
    if (isError) {
      showError(`Error fetching contacts: ${error?.message || 'Unknown error'}`);
    }
  }, [isError, error]);

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-center text-3xl">HubSpot Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="text-center text-red-500">
            <p>Could not load contacts. Please try again later.</p>
            <p className="text-sm text-red-400">{error?.message}</p>
            {error?.message.includes('install the app') && (
              <p className="text-sm mt-2">
                Please <a href="/" className="text-blue-500 hover:underline">install the app</a> or ensure you are logged in.
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Deal ID</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.id}</TableCell>
                  <TableCell>{contact.name}</TableCell>
                  <TableCell>{contact.deal_id}</TableCell>
                  <TableCell>{new Date(contact.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {data?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No contacts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminContacts;