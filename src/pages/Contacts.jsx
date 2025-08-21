"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom'; // Import useLocation
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

const fetchContacts = async (clientId) => {
  if (!clientId) {
    throw new Error('Client ID is missing. Please install the app first.');
  }
  const response = await fetch(`https://txfsspgkakryggiodgic.supabase.co/functions/v1/get-hubspot-contacts?client_id=${clientId}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch contacts');
  }
  return response.json();
};

const Contacts = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const clientId = params.get('client_id'); // Get client_id from URL

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['contacts', clientId], // Include clientId in query key
    queryFn: () => fetchContacts(clientId),
    enabled: !!clientId, // Only run query if clientId is available
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
        {!clientId ? (
          <div className="text-center text-muted-foreground">
            <p>Please install the app first to view contacts.</p>
            <p className="text-sm">Go back to the <a href="/" className="text-blue-500 hover:underline">home page</a> to install.</p>
          </div>
        ) : isLoading ? (
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

export default Contacts;