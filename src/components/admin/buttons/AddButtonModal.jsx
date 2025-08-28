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
import {
  Select as ShadcnSelect, // Renamed to avoid conflict with react-select
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"; // Import ToggleGroup
import Select from 'react-select'; // Import react-select
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Minus } from "lucide-react";

const fetchCardsForSelect = async () => {
  const { data, error } = await supabase
    .from("cards")
    .select("id, title")
    .order("title", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const fetchWebhooksForSelect = async () => {
  const { data, error } = await supabase
    .from("webhooks")
    .select("id, name, url, method")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const fetchQueryParamsForSelect = async () => {
  const { data, error } = await supabase
    .from("query_params")
    .select("id, name, description, default_value")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const customStyles = {
  control: (baseStyles, state) => ({
    ...baseStyles,
    borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
    boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--primary))' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--input))',
    },
    borderRadius: '0.375rem', // Tailwind's rounded-md
    minHeight: '2.5rem', // Tailwind's h-10
    backgroundColor: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
  }),
  menu: (baseStyles) => ({
    ...baseStyles,
    borderRadius: '0.375rem',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // Tailwind's shadow-md
    backgroundColor: 'hsl(var(--popover))',
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
  input: (baseStyles) => ({
    ...baseStyles,
    color: 'hsl(var(--foreground))',
  }),
};

const AddButtonModal = ({ isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [selectedCard, setSelectedCard] = useState(null);
  const [buttonText, setButtonText] = useState("");
  const [buttonType, setButtonType] = useState("url"); // 'url' or 'webhook'
  const [buttonUrl, setButtonUrl] = useState("");
  const [queries, setQueries] = useState([{ key: "", value: "" }]);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
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

  const {
    data: webhooks,
    isLoading: isLoadingWebhooks,
    isError: isErrorWebhooks,
    error: webhooksError,
  } = useQuery({
    queryKey: ["adminWebhooks"],
    queryFn: fetchWebhooksForSelect,
  });

  const {
    data: queryParams,
    isLoading: isLoadingQueryParams,
    isError: isErrorQueryParams,
    error: queryParamsError,
  } = useQuery({
    queryKey: ["adminQueryParams"],
    queryFn: fetchQueryParamsForSelect,
  });

  React.useEffect(() => {
    if (isErrorCards) {
      showError("Failed to load cards for selection: " + cardsError.message);
    }
    if (isErrorWebhooks) {
      showError("Failed to load webhooks for selection: " + webhooksError.message);
    }
    if (isErrorQueryParams) {
      showError("Failed to load query parameters for selection: " + queryParamsError.message);
    }
  }, [isErrorCards, cardsError, isErrorWebhooks, webhooksError, isErrorQueryParams, queryParamsError]);

  const handleAddQuery = () => {
    setQueries([...queries, { key: "", value: "" }]);
  };

  const handleRemoveQuery = (index) => {
    const newQueries = queries.filter((_, i) => i !== index);
    setQueries(newQueries);
  };

  const handleQueryChange = (index, field, value) => {
    const newQueries = queries.map((query, i) =>
      i === index ? { ...query, [field]: value } : query
    );
    setQueries(newQueries);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedCard) {
      showError("Please select a card.");
      setLoading(false);
      return;
    }

    let insertData = {
      card_id: selectedCard.value,
      button_text: buttonText,
      type: buttonType,
    };

    if (buttonType === "url") {
      insertData.button_url = buttonUrl;
      insertData.queries = queries.filter(q => q.key && q.value);
      insertData.webhook_id = null;
    } else { // buttonType === "webhook"
      if (!selectedWebhook) {
        showError("Please select a webhook.");
        setLoading(false);
        return;
      }
      insertData.webhook_id = selectedWebhook.value;
      insertData.button_url = null;
      insertData.queries = [];
    }

    const { error } = await supabase.from("buttons").insert([insertData]);

    if (error) {
      showError("Failed to add button: " + error.message);
    } else {
      showSuccess("Button added successfully!");
      setSelectedCard(null);
      setButtonText("");
      setButtonType("url");
      setButtonUrl("");
      setQueries([{ key: "", value: "" }]);
      setSelectedWebhook(null);
      queryClient.invalidateQueries(["adminButtonsList"]);
      onOpenChange(false);
    }
    setLoading(false);
  };

  const cardOptions = cards?.map(card => ({ value: card.id, label: card.title })) || [];
  const webhookOptions = webhooks?.map(webhook => ({ value: webhook.id, label: `${webhook.name} (${webhook.method})`, url: webhook.url, method: webhook.method })) || [];
  const queryParamOptions = queryParams?.map(param => ({ value: param.name, label: param.name })) || [];

  const currentWebhookDetails = selectedWebhook ? webhooks?.find(wh => wh.id === selectedWebhook.value) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
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
              styles={customStyles}
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
            <Label>Button Type</Label>
            <ToggleGroup
              type="single"
              value={buttonType}
              onValueChange={setButtonType}
              className="flex justify-start border rounded-md overflow-hidden"
              disabled={loading}
            >
              <ToggleGroupItem
                value="url"
                aria-label="Toggle URL type"
                className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:bg-secondary data-[state=off]:text-secondary-foreground hover:bg-primary/90 hover:text-primary-foreground data-[state=off]:hover:bg-secondary/80 data-[state=off]:hover:text-secondary-foreground rounded-none border-r last:border-r-0"
              >
                URL
              </ToggleGroupItem>
              <ToggleGroupItem
                value="webhook"
                aria-label="Toggle Webhook type"
                className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:bg-secondary data-[state=off]:text-secondary-foreground hover:bg-primary/90 hover:text-primary-foreground data-[state=off]:hover:bg-secondary/80 data-[state=off]:hover:text-secondary-foreground rounded-none"
              >
                Webhook
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {buttonType === "url" && (
            <>
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

              <div className="grid gap-2">
                <Label>Query Parameters</Label>
                {queries.map((query, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      options={queryParamOptions}
                      value={queryParamOptions.find(option => option.value === query.key)}
                      onChange={(selectedOption) => handleQueryChange(index, "key", selectedOption ? selectedOption.value : "")}
                      isLoading={isLoadingQueryParams}
                      isDisabled={isLoadingQueryParams || loading}
                      placeholder="Select Key"
                      styles={customStyles}
                      className="w-1/2"
                    />
                    <Input
                      type="text"
                      placeholder="Value"
                      value={query.value}
                      onChange={(e) => handleQueryChange(index, "value", e.target.value)}
                      disabled={loading}
                      className="w-1/2 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveQuery(index)}
                      disabled={loading || queries.length === 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddQuery}
                  disabled={loading}
                  className="mt-2 w-fit"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Query
                </Button>
              </div>
            </>
          )}

          {buttonType === "webhook" && (
            <div className="grid gap-2">
              <Label htmlFor="webhook-select">Select Webhook</Label>
              <Select
                id="webhook-select"
                options={webhookOptions}
                value={selectedWebhook}
                onChange={setSelectedWebhook}
                isLoading={isLoadingWebhooks}
                isDisabled={isLoadingWebhooks || loading}
                placeholder="Select a webhook"
                styles={customStyles}
              />
              {currentWebhookDetails && (
                <div className="mt-2 p-3 text-sm bg-muted rounded-md text-muted-foreground">
                  <p><strong>URL:</strong> {currentWebhookDetails.url}</p>
                  <p><strong>Method:</strong> {currentWebhookDetails.method}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading || !selectedCard || (buttonType === "url" && !buttonUrl) || (buttonType === "webhook" && !selectedWebhook)}>
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