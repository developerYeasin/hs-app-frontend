"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea'; // For client secret

const EditClientAccountModal = ({ isOpen, onOpenChange, clientRecord }) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // These fields will be empty on open, requiring re-entry for security
  const [hubspotClientId, setHubspotClientId] = useState('');
  const [hubspotClientSecret, setHubspotClientSecret] = useState('');

  useEffect(() => {
    if (isOpen) { // Clear fields when modal opens
      setHubspotClientId('');
      setHubspotClientSecret('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!clientRecord?.id) {
      showError("No client record selected for editing.");
      setLoading(false);
      return;
    }

    // Only update if new values are provided
    const updateData = {};
    if (hubspotClientId) {
      // Encrypt the new client ID before sending
      const { data: encryptedClientId, error: encryptIdError } = await supabase.rpc('encrypt_secret', {
        plain_text: hubspotClientId,
        key: Deno.env.get('ENCRYPTION_KEY') // This will be available in the Edge Function context
      });
      if (encryptIdError) {
        showError('Failed to encrypt Client ID: ' + encryptIdError.message);
        setLoading(false);
        return;
      }
      updateData.hubspot_client_id = encryptedClientId;
    }
    if (hubspotClientSecret) {
      // Encrypt the new client secret before sending
      const { data: encryptedClientSecret, error: encryptSecretError } = await supabase.rpc('encrypt_secret', {
        plain_text: hubspotClientSecret,
        key: Deno.env.get('ENCRYPTION_KEY') // This will be available in the Edge Function context
      });
      if (encryptSecretError) {
        showError('Failed to encrypt Client Secret: ' + encryptSecretError.message);
        setLoading(false);
        return;
      }
      updateData.hubspot_client_secret = encryptedClientSecret;
    }

    if (Object.keys(updateData).length === 0) {
      showError("No changes detected. Please enter new credentials to update.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('client')
      .update(updateData)
      .eq('id', clientRecord.id);

    if (error) {
      showError('Failed to update HubSpot client credentials: ' + error.message);
    } else {
      showSuccess('HubSpot client credentials updated successfully!');
      queryClient.invalidateQueries(['clientAccounts', clientRecord.user_id]);
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit HubSpot Client Credentials</DialogTitle>
          <DialogDescription>
            Update the Client ID and Client Secret for Hub ID: {clientRecord?.hub_id}.
            For security, please re-enter the full values if you wish to change them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-client-id">HubSpot Client ID</Label>
            <Input
              id="edit-client-id"
              type="text"
              placeholder="Enter new HubSpot App Client ID"
              value={hubspotClientId}
              onChange={(e) => setHubspotClientId(e.target.value)}
              disabled={loading}
              className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-client-secret">HubSpot Client Secret</Label>
            <Textarea
              id="edit-client-secret"
              placeholder="Enter new HubSpot App Client Secret"
              value={hubspotClientSecret}
              onChange={(e) => setHubspotClientSecret(e.target.value)}
              disabled={loading}
              rows={3}
              className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
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

export default EditClientAccountModal;