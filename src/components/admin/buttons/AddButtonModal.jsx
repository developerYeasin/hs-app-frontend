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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const AddButtonModal = ({ isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [selectedCardId, setSelectedCardId] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonType, setButtonType] = useState("url"); // 'url' or 'webhook'
  const [buttonUrl, setButtonUrl] = useState("");
  const [queries, setQueries] = useState([{ key: "", value: "" }]);
  const [selectedWebhookId, setSelectedWebhookId] = useState("");
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

    if (!selectedCardId) {
      showError("Please select a card.");
      setLoading(false);
      return;
    }

    let insertData = {
      card_id: selectedCardId,
      button_text: buttonText,
      type: buttonType,
    };

    if (buttonType === "url") {
      insertData.button_url = buttonUrl;
      insertData.queries = queries.filter(q => q.key && q.value); // Only save valid queries
      insertData.webhook_id = null; // Ensure webhook_id is null for URL type
    } else { // buttonType === "webhook"
      if (!selectedWebhookId) {
        showError("Please select a webhook.");
        setLoading(false);
        return;
      }
      insertData.webhook_id = selectedWebhookId;
      insertData.button_url = null; // Ensure button_url is null for webhook type
      insertData.queries = []; // Ensure queries are empty for webhook type
    }

    const { error } = await supabase.from("buttons").insert([insertData]);

    if (error) {
      showError("Failed to add button: " + error.message);
    } else {
      showSuccess("Button added successfully!");
      setSelectedCardId("");
      setButtonText("");
      setButtonType("url");
      setButtonUrl("");
      setQueries([{ key: "", value: "" }]);
      setSelectedWebhookId("");
      queryClient.invalidateQueries(["adminButtonsList"]);
      onOpenChange(false);
    }
    setLoading(false);
  };

  const currentWebhook = webhooks?.find(wh => wh.id === selectedWebhookId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-[600px]">
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
              onValueChange={setSelectedCardId}
              value={selectedCardId}
              disabled={isLoadingCards || loading}
            >
              <SelectTrigger
                id="card-select"
                className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent w-full"
              >
                {isLoadingCards ? (
                  <span className="text-muted-foreground">
                    Loading cards...
                  </span>
                ) : (
                  <SelectValue placeholder="Select a card" className="w-full" />
                )}
              </SelectTrigger>
              <SelectContent
                className="rounded-md shadow-md border border-input bg-popover text-popover-foreground"
                position="popper"
              >
                {cards?.length === 0 && !isLoadingCards ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No cards available. Add a card first.
                  </div>
                ) : (
                  cards?.map((card) => (
                    <SelectItem
                      key={card.id}
                      value={card.id}
                      className="w-full"
                    >
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
              className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="grid gap-2">
            <Label>Button Type</Label>
            <RadioGroup
              value={buttonType}
              onValueChange={setButtonType}
              className="flex space-x-4"
              disabled={loading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="url" id="type-url" />
                <Label htmlFor="type-url">URL</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="webhook" id="type-webhook" />
                <Label htmlFor="type-webhook">Webhook</Label>
              </div>
            </RadioGroup>
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
                      onValueChange={(value) => handleQueryChange(index, "key", value)}
                      value={query.key}
                      disabled={isLoadingQueryParams || loading}
                    >
                      <SelectTrigger className="w-1/2 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent">
                        {isLoadingQueryParams ? (
                          <span className="text-muted-foreground">Loading keys...</span>
                        ) : (
                          <SelectValue placeholder="Select Key" />
                        )}
                      </SelectTrigger>
                      <SelectContent className="rounded-md shadow-md border border-input bg-popover text-popover-foreground">
                        {queryParams?.length === 0 && !isLoadingQueryParams ? (
                          <div className="p-2 text-sm text-muted-foreground">No query params available.</div>
                        ) : (
                          queryParams?.map((param) => (
                            <SelectItem key={param.id} value={param.name}>
                              {param.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
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
                onValueChange={setSelectedWebhookId}
                value={selectedWebhookId}
                disabled={isLoadingWebhooks || loading}
              >
                <SelectTrigger
                  id="webhook-select"
                  className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent w-full"
                >
                  {isLoadingWebhooks ? (
                    <span className="text-muted-foreground">
                      Loading webhooks...
                    </span>
                  ) : (
                    <SelectValue placeholder="Select a webhook" className="w-full" />
                  )}
                </SelectTrigger>
                <SelectContent
                  className="rounded-md shadow-md border border-input bg-popover text-popover-foreground"
                  position="popper"
                >
                  {webhooks?.length === 0 && !isLoadingWebhooks ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No webhooks available.
                    </div>
                  ) : (
                    webhooks?.map((webhook) => (
                      <SelectItem
                        key={webhook.id}
                        value={webhook.id}
                        className="w-full"
                      >
                        {webhook.name} ({webhook.method})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {currentWebhook && (
                <div className="mt-2 p-3 text-sm bg-muted rounded-md text-muted-foreground">
                  <p><strong>URL:</strong> {currentWebhook.url}</p>
                  <p><strong>Method:</strong> {currentWebhook.method}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading || !selectedCardId || (buttonType === "url" && !buttonUrl) || (buttonType === "webhook" && !selectedWebhookId)}>
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