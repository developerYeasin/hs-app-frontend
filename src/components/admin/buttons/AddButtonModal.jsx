"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const fetchCardsForSelect = async () => {
  const { data, error } = await supabase.from('cards').select('id, title').order('title', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const AddButtonModal = ({ isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [selectedCardId, setSelectedCardId] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: cards, isLoading: isLoadingCards, isError: isErrorCards, error: cardsError } = useQuery({
    queryKey: ['adminCards'], // This query is for the select dropdown
    queryFn: fetchCardsForSelect,
  });

  React.useEffect(() => {
    if (isErrorCards) {
      showError('Failed to load cards for selection: ' + cardsError.message);
    }
  }, [isErrorCards, cardsError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedCardId) {
      showError('Please select a card.');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('buttons')
      .insert([{ card_id: selectedCardId, button_text: buttonText, button_url: buttonUrl }]);

    if (error) {
      showError('Failed to add button: ' + error.message);
    } else {
      showSuccess('Button added successfully!');
      setSelectedCardId('');
      setButtonText('');
      setButtonUrl('');
      queryClient.invalidateQueries(['adminButtonsList']); // Invalidate to refetch the list in ManageButtons
      onOpenChange(false); // Close the modal
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50 grid w-full gap-4 border bg-background p-8 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg md:w-full sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Button</DialogTitle>
          <DialogDescription>
            Fill in the details for your new button and associate it with a card.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="card-select">Select Card</Label>
            <Select onValueChange={setSelectedCardId} value={selectedCardId} disabled={isLoadingCards || loading}>
              <SelectTrigger id="card-select">
                {isLoadingCards ? (
                  <span className="text-muted-foreground">Loading cards...</span>
                ) : (
                  <SelectValue placeholder="Select a card" />
                )}
              </SelectTrigger>
              <SelectContent className="z-[9999] w-full" position="popper"> {/* Added w-full and position="popper" */}
                {cards?.length === 0 && !isLoadingCards ? (
                  <div className="p-2 text-sm text-muted-foreground">No cards available. Add a card first.</div>
                ) : (
                  cards?.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="button-text">Button Text</Label>
            <Input
              id="button-text"
              type="text"
              placeholder="e.g., Learn More"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="button-url">Button URL</Label>
            <Input
              id="button-url"
              type="url"
              placeholder="https://example.com"
              value={buttonUrl}
              onChange={(e) => setButtonUrl(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !selectedCardId}>
              {loading ? 'Adding Button...' : 'Add Button'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddButtonModal;