"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const fetchCardsForSelect = async () => {
  const { data, error } = await supabase.from('cards').select('id, title').order('title', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const fetchButtons = async () => {
  // Fetch buttons and join with cards table to get card title
  const { data, error } = await supabase
    .from('buttons')
    .select('*, cards(title)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const AddButtonToCard = () => {
  const queryClient = useQueryClient();
  const [selectedCardId, setSelectedCardId] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: cards, isLoading: isLoadingCards, isError: isErrorCards, error: cardsError } = useQuery({
    queryKey: ['adminCards'], // This query is for the select dropdown
    queryFn: fetchCardsForSelect,
  });

  const { data: buttons, isLoading: isLoadingButtons, isError: isErrorButtons, error: buttonsError } = useQuery({
    queryKey: ['adminButtonsList'], // This query is for the table list
    queryFn: fetchButtons,
  });

  useEffect(() => {
    if (isErrorCards) {
      showError('Failed to load cards for selection: ' + cardsError.message);
    }
  }, [isErrorCards, cardsError]);

  useEffect(() => {
    if (isErrorButtons) {
      showError('Failed to load buttons: ' + buttonsError.message);
    }
  }, [isErrorButtons, buttonsError]);

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
      queryClient.invalidateQueries(['adminButtonsList']); // Invalidate to refetch the list
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
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
            <Button type="submit" className="w-full" disabled={loading || !selectedCardId}>
              {loading ? 'Adding Button...' : 'Add Button'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Existing Buttons</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingButtons ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isErrorButtons ? (
            <div className="text-center text-red-500">
              <p>Error loading buttons: {buttonsError?.message}</p>
            </div>
          ) : buttons?.length === 0 ? (
            <div className="text-center text-muted-foreground">No buttons added yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Card Title</TableHead>
                  <TableHead>Button Text</TableHead>
                  <TableHead>Button URL</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buttons?.map((button) => (
                  <TableRow key={button.id}>
                    <TableCell className="font-medium text-xs">{button.id}</TableCell>
                    <TableCell>{button.cards?.title || 'N/A'}</TableCell>
                    <TableCell>{button.button_text}</TableCell>
                    <TableCell className="text-xs truncate max-w-[150px]">{button.button_url}</TableCell>
                    <TableCell>{new Date(button.created_at).toLocaleDateString()}</TableCell>
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

export default AddButtonToCard;