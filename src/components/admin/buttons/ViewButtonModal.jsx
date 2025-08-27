"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { X } from "lucide-react";

const ViewButtonModal = ({ isOpen, onOpenChange, button }) => { // Receive button object directly
  // No need for fetchButtonDetails as we already have the button object with joined data
  // from ManageButtons.jsx's fetchButtons query.

  React.useEffect(() => {
    // If there was an error fetching the button in the parent, it would be handled there.
    // This modal just displays the passed `button` prop.
    if (!button && isOpen) {
      showError('No button data provided to view.');
    }
  }, [button, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Button Details</DialogTitle>
          <DialogDescription>
            Detailed information about the selected button.
          </DialogDescription>
        </DialogHeader>
        {!button ? (
          <div className="text-center text-red-500 py-4">
            <p>Error loading button details or no button selected.</p>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Button Text:</h3>
              <p>{button.button_text}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Associated Card:</h3>
              <p>{button.cards?.title || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Button Type:</h3>
              <p className="capitalize">{button.type}</p>
            </div>

            {button.type === 'url' && (
              <>
                <div>
                  <h3 className="text-lg font-semibold">Button URL:</h3>
                  <p className="break-all">
                    <a href={button.button_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      {button.button_url}
                    </a>
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Query Parameters:</h3>
                  {button.queries && button.queries.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {button.queries.map((query, index) => (
                        <li key={index}>
                          <span className="font-medium">{query.key}</span>: {query.value}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No query parameters.</p>
                  )}
                </div>
              </>
            )}

            {button.type === 'webhook' && (
              <div>
                <h3 className="text-lg font-semibold">Webhook:</h3>
                {button.webhooks ? (
                  <div className="space-y-1">
                    <p><strong>Name:</strong> {button.webhooks.name}</p>
                    <p><strong>URL:</strong> {button.webhooks.url}</p>
                    <p><strong>Method:</strong> {button.webhooks.method}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No webhook associated.</p>
                )}
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold">Created At:</h3>
              <p>{new Date(button.created_at).toLocaleString()}</p>
            </div>
          </div>
        )}
        <DialogClose className="absolute right-[10px] top-[10px] rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default ViewButtonModal;