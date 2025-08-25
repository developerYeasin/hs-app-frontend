"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';

const fetchButtonDetails = async (buttonId) => {
  const { data, error } = await supabase
    .from('buttons')
    .select('*, cards(title)') // Select button and its associated card title
    .eq('id', buttonId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const ViewButtonModal = ({ isOpen, onOpenChange, buttonId }) => {
  const { data: buttonDetails, isLoading, isError, error } = useQuery({
    queryKey: ['viewButton', buttonId],
    queryFn: () => fetchButtonDetails(buttonId),
    enabled: isOpen && !!buttonId, // Only fetch when modal is open and buttonId is available
  });

  React.useEffect(() => {
    if (isError) {
      showError('Failed to load button details: ' + error.message);
    }
  }, [isError, error]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 grid w-full gap-4 border bg-background p-8 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg md:w-full sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Button Details</DialogTitle>
          <DialogDescription>
            Detailed information about the selected button.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Separator className="my-4" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        ) : isError ? (
          <div className="text-center text-red-500 py-4">
            <p>Error loading button details.</p>
            <p className="text-sm text-red-400">{error?.message}</p>
          </div>
        ) : buttonDetails ? (
          <div className="py-4 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Button Text:</h3>
              <p>{buttonDetails.button_text}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Button URL:</h3>
              <p className="break-all"><a href={buttonDetails.button_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{buttonDetails.button_url}</a></p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Associated Card:</h3>
              <p>{buttonDetails.cards?.title || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Created At:</h3>
              <p>{new Date(buttonDetails.created_at).toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">No button data available.</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewButtonModal;