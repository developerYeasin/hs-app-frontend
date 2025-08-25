"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

const fetchCards = async () => {
  const { data, error } = await supabase.from('cards').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const AddCard = () => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: cards, isLoading: isLoadingCards, isError: isErrorCards, error: cardsError } = useQuery({
    queryKey: ['adminCardsList'],
    queryFn: fetchCards,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('cards')
      .insert([{ title, description, image_url: imageUrl }]);

    if (error) {
      showError('Failed to add card: ' + error.message);
    } else {
      showSuccess('Card added successfully!');
      setTitle('');
      setDescription('');
      setImageUrl('');
      queryClient.invalidateQueries(['adminCardsList']); // Invalidate to refetch the list
      queryClient.invalidateQueries(['adminCards']); // Invalidate for AddButtonToCard's select
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Card</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Card Title</Label>
              <Input
                id="title"
                type="text"
                placeholder="Enter card title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter card description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Adding Card...' : 'Add Card'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Existing Cards</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCards ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isErrorCards ? (
            <div className="text-center text-red-500">
              <p>Error loading cards: {cardsError?.message}</p>
            </div>
          ) : cards?.length === 0 ? (
            <div className="text-center text-muted-foreground">No cards added yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Image URL</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards?.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium text-xs">{card.id}</TableCell>
                    <TableCell>{card.title}</TableCell>
                    <TableCell className="text-sm">{card.description?.substring(0, 50)}...</TableCell>
                    <TableCell className="text-xs truncate max-w-[150px]">{card.image_url}</TableCell>
                    <TableCell>{new Date(card.created_at).toLocaleDateString()}</TableCell>
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

export default AddCard;