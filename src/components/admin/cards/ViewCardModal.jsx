"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';

const fetchCardWithButtons = async (cardId) => {
  const { data, error } = await supabase
    .from('cards')
    .select('*, buttons(*)') // Select card and its associated buttons
    .eq('id', cardId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const ViewCardModal = ({ isOpen, onOpenChange, cardId }) => {
  const { data: cardDetails, isLoading, isError, error } = useQuery({
    queryKey: ['viewCard', cardId],
    queryFn: () => fetchCardWithButtons(cardId),
    enabled: isOpen && !!cardId, // Only fetch when modal is open and cardId is available
  });

  React.useEffect(() => {
    if (isError) {
      showError('Failed to load card details: ' + error.message);
    }
  }, [isError, error]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 grid w-full gap-4 border bg-background p-8 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg md:w-full sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Card Details</DialogTitle>
          <DialogDescription>
            Detailed information about the selected card and its associated buttons.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Separator className="my-4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : isError ? (
          <div className="text-center text-red-500 py-4">
            <p>Error loading card details.</p>
            <p className="text-sm text-red-400">{error?.message}</p>
          </div>
        ) : cardDetails ? (
          <div className="py-4 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Title:</h3>
              <p>{cardDetails.title}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Description:</h3>
              <p>{cardDetails.description || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Image URL:</h3>
              <p className="break-all">{cardDetails.image_url || 'N/A'}</p>
              {cardDetails.image_url && (
                <img src={cardDetails.image_url} alt={cardDetails.title} className="mt-2 max-h-48 object-contain rounded-md border" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">Created At:</h3>
              <p>{new Date(cardDetails.created_at).toLocaleString()}</p>
            </div>

            <Separator className="my-4" />

            <div>
              <h3 className="text-lg font-semibold mb-2">Associated Buttons:</h3>
              {cardDetails.buttons && cardDetails.buttons.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {cardDetails.buttons.map((button) => (
                    <li key={button.id}>
                      <span className="font-medium">{button.button_text}</span>: <a href={button.button_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">{button.button_url}</a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No buttons associated with this card.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">No card data available.</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewCardModal;