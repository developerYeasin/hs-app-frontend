"use client";

import React, { useState } from 'react';
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
import { supabase, supabaseAnonKey } from '@/integrations/supabase/client.js';
import { useSession } from '@/components/auth/SessionContextProvider';
import Select from 'react-select';

const customStyles = {
  control: (baseStyles, state) => ({
    ...baseStyles,
    borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
    boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--primary))' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
    },
    borderRadius: '0.375rem', // Tailwind's rounded-md
    minHeight: '2.5rem', // Tailwind's h-10
    backgroundColor: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
  }),
  menu: (baseStyles) => ({
    ...baseStyles,
    borderRadius: '0.375rem',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // Tailwind's shadow-md
    backgroundColor: 'hsl(var(--popover))',
  }),
  option: (baseStyles, state) => ({
    ...baseStyles,
    backgroundColor: state.isFocused ? 'hsl(var(--accent))' : 'transparent',
    color: state.isFocused ? 'hsl(var(--accent-foreground))' : 'hsl(var(--foreground))',
    '&:active': {
      backgroundColor: 'hsl(var(--accent))',
    },
  }),
  singleValue: (baseStyles) => ({
    ...baseStyles,
    color: 'hsl(var(--foreground))',
  }),
  placeholder: (baseStyles) => ({
    ...baseStyles,
    color: 'hsl(var(--muted-foreground))',
  }),
  input: (baseStyles) => ({
    ...baseStyles,
    color: 'hsl(var(--foreground))',
  }),
};

const fetchClientAccountsForSelect = async (userId) => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('client')
    .select('id, hub_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const fetchContacts = async (hubId) => {
  if (!hubId) return { data: [] }; // Return empty if no hubId is selected
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  const baseUrl = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/get-hubspot-contacts`;
  const urlParams = new URLSearchParams();
  urlParams.append('apikey', supabaseAnonKey);
  urlParams.append('hub_id', hubId); // Pass the selected hub_id

  const url = `${baseUrl}?${urlParams.toString()}`;

  const headers = {
    'Content-Type': 'application/json',
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
  const { user, isLoading: isLoadingUser } = useSession();
  const [selectedHubspotAccount, setSelectedHubspotAccount] = useState(null);

  const {
    data: clientAccounts,
    isLoading: isLoadingClientAccounts,
    isError: isErrorClientAccounts,
    error: clientAccountsError,
  } = useQuery({
    queryKey: ['clientAccountsForSelect', user?.id],
    queryFn: () => fetchClientAccountsForSelect(user?.id),
    enabled: !!user?.id,
  });

  // Set initial selected account if available
  React.useEffect(() => {
    if (clientAccounts && clientAccounts.length > 0 && !selectedHubspotAccount) {
      setSelectedHubspotAccount({ value: clientAccounts[0].hub_id, label: `Hub ID: ${clientAccounts[0].hub_id}` });
    }
  }, [clientAccounts, selectedHubspotAccount]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['contacts', selectedHubspotAccount?.value],
    queryFn: () => fetchContacts(selectedHubspotAccount?.value),
    enabled: !!selectedHubspotAccount?.value, // Only fetch if a hub_id is selected
  });

  React.useEffect(() => {
    if (isError) {
      showError(`Error fetching contacts: ${error?.message || 'Unknown error'}`);
    }
  }, [isError, error]);

  const accountOptions = clientAccounts?.map(account => ({
    value: account.hub_id,
    label: `Hub ID: ${account.hub_id}`
  })) || [];

  if (isLoadingUser) {
    return <div className="text-center py-8">Loading user session...</div>;
  }

  if (!user) {
    return <div className="text-center py-8 text-red-500">Please log in to view HubSpot contacts.</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-center text-3xl">HubSpot Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label htmlFor="hubspot-account-select">Select HubSpot Account</Label>
          <Select
            id="hubspot-account-select"
            options={accountOptions}
            value={selectedHubspotAccount}
            onChange={setSelectedHubspotAccount}
            isLoading={isLoadingClientAccounts}
            isDisabled={isLoadingClientAccounts || accountOptions.length === 0}
            placeholder="Select a HubSpot account"
            styles={customStyles}
          />
          {accountOptions.length === 0 && !isLoadingClientAccounts && (
            <p className="text-sm text-muted-foreground mt-2">
              No HubSpot accounts connected. Please go to{' '}
              <a href="/admin/client-accounts" className="text-blue-500 hover:underline">Client Accounts</a> to connect one.
            </p>
          )}
        </div>

        {selectedHubspotAccount?.value ? (
          isLoading ? (
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
                      No contacts found for this account.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )
        ) : (
          <div className="text-center text-muted-foreground">
            Please select a HubSpot account to view contacts.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminContacts;