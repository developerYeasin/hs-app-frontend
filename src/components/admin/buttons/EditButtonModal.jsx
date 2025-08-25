"use client";

import React, { useState, useEffect } from 'react';
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

const EditButtonModal = ({ isOpen, onOpenChange, button }) => {
  const queryClient = useQueryClient();
  const [selectedCardId, setSelectedCardId] = useState(button?.card_id || '');
  const [buttonText, setButtonText] = useState(button?.button_text || '');
  const [buttonUrl, setButtonUrl] = useState(button?.button_url || '');
  const [loading, setLoading] = useState(false);

  const { data: cards, isLoading: isLoadingCards, isError: isErrorCards, error: cardsError } = useQuery({
    queryKey: ['adminCards'],
    queryFn: fetchCardsForSelect,
  });

  useEffect(() => {
    if (button) {
      setSelectedCardId(button.card_id || '');
      setButtonText(button.button_text || '');
      setButtonUrl(button.button_url || '');
    }
  }, [button]);

  useEffect(() => {
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
      .update({ card_id: selectedCardId, button_text: buttonText, button_url: buttonUrl })
      .eq('id', button.id);

    if (error) {
      showError('Failed to update button: ' + error.message);
    } else {
      showSuccess('Button updated successfully!');
      queryClient.invalidateQueries(['adminButtonsList']); // Invalidate to refetch the list in ManageButtons
      onOpenChange(false); // Close the modal
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Button</DialogTitle>
          <DialogDescription>
            Make changes to your button here. Click save when you're done.
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
              <SelectContent>
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
              {loading ? 'Saving changes...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditButtonModal;