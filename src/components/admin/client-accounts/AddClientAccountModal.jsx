"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from "lucide-react"; // Removed PlusCircle as OAuth tab is removed
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/auth/SessionContextProvider';
import { v4 as uuidv4 } from "uuid";
// Removed Tabs, TabsContent, TabsList, TabsTrigger as OAuth tab is removed
import { Textarea } from '@/components/ui/textarea'; // For client secret

const AddClientAccountModal = ({ isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [loading, setLoading] = useState(false);

  // State for manual entry
  const [manualHubId, setManualHubId] = useState('');
  const [manualClientId, setManualClientId] = useState('');
  const [manualClientSecret, setManualClientSecret] = useState('');

  // Removed handleOAuthConnectInitial as the OAuth tab is removed from this modal.

  const handleManualConnect = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      showError("Please log in to connect a HubSpot account.");
      setLoading(false);
      return;
    }

    if (!manualHubId || !manualClientId || !manualClientSecret) {
      showError("All manual fields (Hub ID, Client ID, Client Secret) are required.");
      setLoading(false);
      return;
    }

    const newClientId = uuidv4(); // Our internal UUID for this new manual connection

    try {
      const response = await fetch('https://txfsspgkakryggiodgic.supabase.co/functions/v1/save-client-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabase.supabaseKey, // Use the anon key for Edge Function invocation
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
        },
        body: JSON.stringify({
          id: newClientId,
          user_id: user.id,
          hub_id: manualHubId,
          hubspot_client_id: manualClientId,
          hubspot_client_secret: manualClientSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add HubSpot account manually.');
      }

      showSuccess('HubSpot account added manually! Please use the "Connect via OAuth" button in the table to get access tokens.');
      setManualHubId('');
      setManualClientId('');
      setManualClientSecret('');
      queryClient.invalidateQueries(['clientAccounts', user?.id]);
      onOpenChange(false);
    } catch (error) {
      showError('Failed to add HubSpot account manually: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New HubSpot Account (Manual Entry)</DialogTitle>
          <DialogDescription>
            Manually enter your HubSpot Hub ID, Client ID, and Client Secret.
            You will then need to use the "Connect via OAuth" button in the table to get access and refresh tokens.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleManualConnect} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="manual-hub-id">Hub ID</Label>
            <Input
              id="manual-hub-id"
              type="text"
              placeholder="e.g., 12345678"
              value={manualHubId}
              onChange={(e) => setManualHubId(e.target.value)}
              required
              disabled={loading}
              className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="manual-client-id">HubSpot Client ID</Label>
            <Input
              id="manual-client-id"
              type="text"
              placeholder="Your HubSpot App Client ID"
              value={manualClientId}
              onChange={(e) => setManualClientId(e.target.value)}
              required
              disabled={loading}
              className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="manual-client-secret">HubSpot Client Secret</Label>
            <Textarea
              id="manual-client-secret"
              placeholder="Your HubSpot App Client Secret"
              value={manualClientSecret}
              onChange={(e) => setManualClientSecret(e.target.value)}
              required
              disabled={loading}
              rows={3}
              className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !user}>
              {loading ? 'Adding...' : 'Add Manually'}
            </Button>
          </DialogFooter>
        </form>

        <DialogClose className="absolute right-[10px] top-[10px] rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientAccountModal;