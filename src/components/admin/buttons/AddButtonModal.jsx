"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Select from 'react-select'; // Import react-select
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

const fetchCardsForSelect = async () => {
  const { data, error } = await supabase
    .from("cards")
    .select("id, title")
    .order("title", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const AddButtonModal = ({ isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [selectedCard, setSelectedCard] = useState(null); // Store the selected card object
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    data: cards,
    isLoading: isLoadingCards,
    isError: isErrorCards,
    error: cardsError,
  } = useQuery({
    queryKey: ["adminCards"],
    queryFn: fetchCardsForSelect,
  });

  React.useEffect(() => {
    if (isErrorCards) {
      showError("Failed to load cards for selection: " + cardsError.message);
    }
  }, [isErrorCards, cardsError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedCard) {
      showError("Please select a card.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("buttons").insert([
      {
        card_id: selectedCard.value, // Use the value from the react-select object
        button_text: buttonText,
        button_url: buttonUrl,
      },
    ]);

    if (error) {
      showError("Failed to add button: " + error.message);
    } else {
      showSuccess("Button added successfully!");
      setSelectedCard(null); // Clear selected card
      setButtonText("");
      setButtonUrl("");
      queryClient.invalidateQueries(["adminButtonsList"]);
      onOpenChange(false);
    }
    setLoading(false);
  };

  // Transform cards data for react-select
  const cardOptions = cards?.map(card => ({ value: card.id, label: card.title })) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Add New Button</DialogTitle>
          <DialogDescription>
            Fill in the details for your new button and associate it with a
            card.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="card-select">Select Card</Label>
            <Select
              id="card-select"
              options={cardOptions}
              value={selectedCard}
              onChange={setSelectedCard}
              isLoading={isLoadingCards}
              isDisabled={isLoadingCards || loading}
              placeholder="Select a card"
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (baseStyles, state) => ({
                  ...baseStyles,
                  borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
                  boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--primary))' : 'none',
                  '&:hover': {
                    borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
                  },
                  borderRadius: '0.375rem', // Tailwind's rounded-md
                  minHeight: '2.5rem', // Tailwind's h-10
                }),
                menu: (baseStyles) => ({
                  ...baseStyles,
                  borderRadius: '0.375rem',
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // Tailwind's shadow-md
                }),
                option: (baseStyles, state) => ({
                  ...baseStyles,
                  backgroundColor: state.isFocused ? 'hsl(var(--accent))' : 'transparent',
                  color: state.isFocused ? 'hsl(var(--accent-foreground))' : 'hsl(var(--foreground))',
                  '&:active': {
                    backgroundColor: 'hsl(var(--accent))',
                  },
                }),
                singleValue: (baseStyles) => ({
                  ...baseStyles,
                  color: 'hsl(var(--foreground))',
                }),
                placeholder: (baseStyles) => ({
                  ...baseStyles,
                  color: 'hsl(var(--muted-foreground))',
                }),
              }}
            />
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
              className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
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
              className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !selectedCard}>
              {loading ? "Adding Button..." : "Add Button"}
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

export default AddButtonModal;