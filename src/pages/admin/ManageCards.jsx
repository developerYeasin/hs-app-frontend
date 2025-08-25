"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { PlusCircle, Edit, Eye, Trash2 } from 'lucide-react';
import AddCardModal from '@/components/admin/cards/AddCardModal';
import EditCardModal from '@/components/admin/cards/EditCardModal';
import ViewCardModal from '@/components/admin/cards/ViewCardModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const fetchCards = async () => {
  const { data, error } = await supabase.from('cards').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const ManageCards = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardToDelete, setCardToDelete] = useState(null);

  const { data: cards, isLoading: isLoadingCards, isError: isErrorCards, error: cardsError } = useQuery({
    queryKey: ['adminCardsList'],
    queryFn: fetchCards,
  });

  const handleDeleteCard = async (cardId) => {
    setCardToDelete(null); // Clear the card to delete immediately
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId);

    if (error) {
      showError('Failed to delete card: ' + error.message);
    } else {
      showSuccess('Card deleted successfully!');
      queryClient.invalidateQueries(['adminCardsList']);
      queryClient.invalidateQueries(['adminCards']); // Invalidate for ManageButtons' select
    }
  };

  const openEditModal = (card) => {
    setSelectedCard(card);
    setIsEditModalOpen(true);
  };

  const openViewModal = (card) => {
    setSelectedCard(card);
    setIsViewModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-4xl mx-auto"> {/* Added mx-auto here */}
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-2xl">Manage Cards</CardTitle>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Card
          </Button>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards?.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium text-xs">{card.id}</TableCell>
                    <TableCell>{card.title}</TableCell>
                    <TableCell className="text-sm">{card.description?.substring(0, 50)}{card.description && card.description.length > 50 ? '...' : ''}</TableCell>
                    <TableCell className="text-xs truncate max-w-[150px]">{card.image_url}</TableCell>
                    <TableCell>{new Date(card.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="icon" onClick={() => openViewModal(card)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => openEditModal(card)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" onClick={() => setCardToDelete(card.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          {cardToDelete === card.id && (
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the card and any associated buttons.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setCardToDelete(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCard(card.id)}>Continue</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          )}
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddCardModal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      {selectedCard && (
        <EditCardModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} card={selectedCard} />
      )}
      {selectedCard && (
        <ViewCardModal isOpen={isViewModalOpen} onOpenChange={setIsViewModalOpen} cardId={selectedCard.id} />
      )}
    </div>
  );
};

export default ManageCards;