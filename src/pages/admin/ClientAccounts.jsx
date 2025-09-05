"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { v4 as uuidv4 } from "uuid";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const fetchClientAccounts = async (userId) => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('client')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const ClientAccounts = () => {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingUser } = useSession();
  const [clientToDelete, setClientToDelete] = useState(null);

  const {
    data: clientAccounts,
    isLoading: isLoadingAccounts,
    isError: isErrorAccounts,
    error: accountsError,
  } = useQuery({
    queryKey: ['clientAccounts', user?.id],
    queryFn: () => fetchClientAccounts(user?.id),
    enabled: !!user?.id,
  });

  React.useEffect(() => {
    if (isErrorAccounts) {
      showError('Failed to load connected HubSpot accounts: ' + accountsError.message);
    }
  }, [isErrorAccounts, accountsError]);

  const handleConnectNewAccount = () => {
    if (!user) {
      showError("Please log in to connect a HubSpot account.");
      return;
    }
    const clientId = uuidv4(); // Our internal client ID for this new connection
    const statePayload = { client_id: clientId, user_id: user.id };
    window.location.href = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/install-hubspot?client_id=${clientId}&state=${encodeURIComponent(JSON.stringify(statePayload))}`;
  };

  const handleReauthenticate = (clientRecord) => {
    if (!user) {
      showError("Please log in to re-authenticate.");
      return;
    }
    // When re-authenticating, we pass the existing clientRecord.id (our UUID) and hub_id in the state
    const statePayload = { client_id: clientRecord.id, user_id: user.id, hub_id: clientRecord.hub_id };
    window.location.href = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/install-hubspot?client_id=${clientRecord.id}&state=${encodeURIComponent(JSON.stringify(statePayload))}`;
  };

  const handleDeleteClient = async (clientId) => {
    setClientToDelete(null); // Clear the client to delete immediately
    const { error } = await supabase.from('client').delete().eq('id', clientId);

    if (error) {
      showError('Failed to delete HubSpot account connection: ' + error.message);
    } else {
      showSuccess('HubSpot account connection deleted successfully!');
      queryClient.invalidateQueries(['clientAccounts', user?.id]);
    }
  };

  if (isLoadingUser) {
    return <div className="text-center py-8">Loading user session...</div>;
  }

  if (!user) {
    return <div className="text-center py-8 text-red-500">Please log in to manage HubSpot accounts.</div>;
  }

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-2xl">Manage HubSpot Accounts</CardTitle>
          <Button
            onClick={handleConnectNewAccount}
            className="py-2.5 px-4 flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Connect New Account
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingAccounts ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isErrorAccounts ? (
            <div className="text-center text-red-500">
              <p>Error loading connected accounts: {accountsError?.message}</p>
            </div>
          ) : clientAccounts?.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No HubSpot accounts connected yet. Click "Connect New Account" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hub ID</TableHead>
                  <TableHead>Connected At</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientAccounts?.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.hub_id || 'N/A'}</TableCell>
                    <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {client.expires_at ? new Date(client.expires_at).toLocaleDateString() : 'N/A'}
                      {client.expires_at && new Date(client.expires_at) < new Date() && (
                        <span className="ml-2 text-red-500 text-xs">(Expired)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleReauthenticate(client)}
                          title="Re-authenticate"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => setClientToDelete(client.id)}
                              title="Delete connection"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          {clientToDelete === client.id && (
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you absolutely sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete the connection to this HubSpot account.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  onClick={() => setClientToDelete(null)}
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteClient(client.id)}
                                >
                                  Continue
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          )}
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientAccounts;