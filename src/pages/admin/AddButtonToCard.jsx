"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery } from '@tanstack/react-query';

const fetchCards = async () => {
  console.log('AddButtonToCard: Attempting to fetch cards...');
  const { data, error } = await supabase.from('cards').select('id, title');
  if (error) {
    console.error('AddButtonToCard: Error fetching cards from Supabase:', error.message);
    throw new Error(error.message);
  }
  console.log('AddButtonToCard: Successfully fetched cards:', data);
  return data;
};

const AddButtonToCard = () => {
  console.log('AddButtonToCard: Component rendering...');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: cards, isLoading: isLoadingCards, isError: isErrorCards, error: cardsError } = useQuery({
    queryKey: ['adminCards'],
    queryFn: fetchCards,
  });

  useEffect(() => {
    if (isErrorCards) {
      showError('Failed to load cards: ' + cardsError.message);
      console.error('AddButtonToCard: useQuery error state:', cardsError);
    }
  }, [isErrorCards, cardsError]);

  console.log('AddButtonToCard: isLoadingCards:', isLoadingCards);
  console.log('AddButtonToCard: isErrorCards:', isErrorCards);
  console.log('AddButtonToCard: cards data:', cards);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedCardId) {
      showError('Please select a card.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('buttons')
      .insert([{ card_id: selectedCardId, button_text: buttonText, button_url: buttonUrl }]);

    if (error) {
      showError('Failed to add button: ' + error.message);
      console.error('AddButtonToCard: Error adding button to Supabase:', error);
    } else {
      showSuccess('Button added successfully!');
      setSelectedCardId('');
      setButtonText('');
      setButtonUrl('');
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Add Button to Card</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="card-select">Select Card</Label>
            <Select onValueChange={setSelectedCardId} value={selectedCardId} disabled={isLoadingCards || loading}>
              <SelectTrigger id="card-select">
                <SelectValue placeholder="Select a card" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCards && <SelectItem value="" disabled>Loading cards...</SelectItem>}
                {cards?.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.title}
                  </SelectItem>
                ))}
                {!isLoadingCards && cards?.length === 0 && (
                  <SelectItem value="" disabled>No cards available. Add a card first.</SelectItem>
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
          <Button type="submit" className="w-full" disabled={loading || !selectedCardId}>
            {loading ? 'Adding Button...' : 'Add Button'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddButtonToCard;