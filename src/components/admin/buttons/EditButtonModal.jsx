"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable'; // Import CreatableSelect
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Minus } from "lucide-react";

const fetchCardsForSelect = async () => {
  const { data, error } = await supabase.from('cards').select('id, title').order('title', { ascending: true });
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

const EditButtonModal = ({ isOpen, onOpenChange, button }) => {
  const queryClient = useQueryClient();
  const [selectedCard, setSelectedCard] = useState(null);
  const [buttonText, setButtonText] = useState(button?.button_text || '');
  const [apiUrl, setApiUrl] = useState(button?.api_url || '');
  const [apiMethod, setApiMethod] = useState({ value: "POST", label: "POST" }); // Default to POST, react-select format
  const [apiBodyTemplate, setApiBodyTemplate] = useState(button?.api_body_template || '');
  // Updated queries state to include a 'type' for each query value
  const [queries, setQueries] = useState(button?.queries?.map(q => ({
    key: q.key,
    value: q.value.startsWith('{{contact.') && q.value.endsWith('}}') ? q.value.replace('{{contact.', '').replace('}}', '') : q.value,
    valueType: q.value.startsWith('{{contact.') && q.value.endsWith('}}') ? 'contact_property' : 'static'
  })) || [{ key: "", value: "", valueType: "static" }]);
  const [loading, setLoading] = useState(false);

  const { data: cards, isLoading: isLoadingCards, isError: isErrorCards, error: cardsError } = useQuery({
    queryKey: ['adminCards'],
    queryFn: fetchCardsForSelect,
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

  const apiMethodOptions = [
    { value: "GET", label: "GET" },
    { value: "POST", label: "POST" },
    { value: "PUT", label: "PUT" },
    { value: "DELETE", label: "DELETE" },
    { value: "PATCH", label: "PATCH" },
  ];

  const queryValueTypeOptions = [
    { value: "static", label: "Static Value" },
    { value: "contact_property", label: "Contact Property" },
  ];

  // Common HubSpot contact properties for suggestions
  const hubspotContactProperties = [
    { value: "email", label: "Email" },
    { value: "firstname", label: "First Name" },
    { value: "lastname", label: "Last Name" },
    { value: "phone", label: "Phone" },
    { value: "company", label: "Company" },
    { value: "website", label: "Website" },
    { value: "lifecyclestage", label: "Lifecycle Stage" },
    { value: "createdate", label: "Create Date" }, // Added
    { value: "hs_object_id", label: "HubSpot Object ID" }, // Added
    { value: "lastmodifieddate", label: "Last Modified Date" }, // Added
    // Add more as needed
  ];

  useEffect(() => {
    if (button && cards) {
      const initialCard = cards.find(card => card.id === button.card_id);
      if (initialCard) {
        setSelectedCard({ value: initialCard.id, label: initialCard.title });
      }
      setButtonText(button.button_text || '');
      setApiUrl(button.api_url || '');
      // Set apiMethod in react-select format
      setApiMethod(apiMethodOptions.find(option => option.value === (button.api_method || 'POST')) || { value: "POST", label: "POST" });
      setApiBodyTemplate(button.api_body_template || '');
      // Map existing queries to the new format
      setQueries(button.queries && button.queries.length > 0 ? button.queries.map(q => ({
        key: q.key,
        value: q.value.startsWith('{{contact.') && q.value.endsWith('}}') ? q.value.replace('{{contact.', '').replace('}}', '') : q.value,
        valueType: q.value.startsWith('{{contact.') && q.value.endsWith('}}') ? 'contact_property' : 'static'
      })) : [{ key: "", value: "", valueType: "static" }]);
    }
  }, [button, cards]);

  React.useEffect(() => {
    if (isErrorCards) {
      showError('Failed to load cards for selection: ' + cardsError.message);
    }
    if (isErrorQueryParams) {
      showError("Failed to load query parameters for selection: " + queryParamsError.message);
    }
  }, [isErrorCards, cardsError, isErrorQueryParams, queryParamsError]);

  const handleAddQuery = () => {
    setQueries([...queries, { key: "", value: "", valueType: "static" }]);
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
      showError('Please select a card.');
      setLoading(false);
      return;
    }

    let updateData = {
      card_id: selectedCard.value,
      button_text: buttonText,
      api_url: apiUrl,
      api_method: apiMethod.value, // Use .value for the actual method string
      queries: [],
      api_body_template: null,
    };

    if (apiMethod.value.toUpperCase() === "GET") {
      // Process queries based on valueType
      updateData.queries = queries.filter(q => q.key && q.value).map(q => ({
        key: q.key,
        value: q.valueType === "contact_property" ? `{{contact.${q.value}}}` : q.value,
      }));
    } else { // POST, PUT, DELETE, PATCH
      updateData.api_body_template = apiBodyTemplate || null;
    }

    const { error } = await supabase
      .from('buttons')
      .update(updateData)
      .eq('id', button.id);

    if (error) {
      showError('Failed to update button: ' + error.message);
    } else {
      showSuccess('Button updated successfully!');
      queryClient.invalidateQueries(['adminButtonsList']);
      onOpenChange(false);
    }
    setLoading(false);
  };

  const cardOptions = cards?.map(card => ({ value: card.id, label: card.title })) || [];
  const queryParamOptions = queryParams?.map(param => ({ value: param.name, label: param.name })) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Button</DialogTitle>
          <DialogDescription>
            Make changes to your button here. Click save when you're done.
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
              placeholder="e.g., Trigger Action"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              required
              disabled={loading}
              className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="api-url">Webhook API URL</Label>
            <Input
              id="api-url"
              type="url"
              placeholder="https://api.example.com/endpoint"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              required
              disabled={loading}
              className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="api-method">API Method</Label>
            <Select
              id="api-method"
              options={apiMethodOptions}
              value={apiMethod}
              onChange={setApiMethod}
              isDisabled={loading}
              placeholder="Select API Method"
              styles={customStyles}
            />
          </div>

          {apiMethod.value.toUpperCase() === "GET" && (
            <div className="grid gap-2">
              <Label>Query Parameters</Label>
              {queries.map((query, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CreatableSelect // Changed to CreatableSelect
                    options={queryParamOptions}
                    value={query.key ? { value: query.key, label: query.key } : null}
                    onChange={(selectedOption) => handleQueryChange(index, "key", selectedOption ? selectedOption.value : "")}
                    isLoading={isLoadingQueryParams}
                    isDisabled={isLoadingQueryParams || loading}
                    placeholder="Select or type Key"
                    styles={customStyles}
                    className="w-1/3"
                  />
                  <Select
                    options={queryValueTypeOptions}
                    value={queryValueTypeOptions.find(option => option.value === query.valueType)}
                    onChange={(selectedOption) => handleQueryChange(index, "valueType", selectedOption ? selectedOption.value : "static")}
                    isDisabled={loading}
                    placeholder="Value Type"
                    styles={customStyles}
                    className="w-1/4"
                  />
                  {query.valueType === "static" ? (
                    <Input
                      type="text"
                      placeholder="Static Value"
                      value={query.value}
                      onChange={(e) => handleQueryChange(index, "value", e.target.value)}
                      disabled={loading}
                      className="w-1/3 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  ) : (
                    <Select
                      options={hubspotContactProperties}
                      value={hubspotContactProperties.find(option => option.value === query.value)}
                      onChange={(selectedOption) => handleQueryChange(index, "value", selectedOption ? selectedOption.value : "")}
                      isDisabled={loading}
                      placeholder="Select Property"
                      styles={customStyles}
                      className="w-1/3"
                    />
                  )}
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
          )}

          {['POST', 'PUT', 'DELETE', 'PATCH'].includes(apiMethod.value.toUpperCase()) && (
            <div className="grid gap-2">
              <Label htmlFor="api-body-template">API Body Template (JSON)</Label>
              <Textarea
                id="api-body-template"
                placeholder='{"key": "{{contact.email}}", "objectId": "{{objectId}}", "hubId": "{{hub_id}}"}'
                value={apiBodyTemplate}
                onChange={(e) => setApiBodyTemplate(e.target.value)}
                disabled={loading}
                rows={6}
                className="rounded-md focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use placeholders like <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">&lbrace;&lbrace;contact.property&rbrace;&rbrace;</code> (e.g., <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">&lbrace;&lbrace;contact.email&rbrace;&rbrace;</code>), <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">&lbrace;&lbrace;objectId&rbrace;&rbrace;</code>, <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">&lbrace;&lbrace;objectTypeId&rbrace;&rbrace;</code>, <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">&lbrace;&lbrace;hub_id&rbrace;&rbrace;</code>, and <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">&lbrace;&lbrace;button_id&rbrace;&rbrace;</code>.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading || !selectedCard || !apiUrl}>
              {loading ? 'Saving changes...' : 'Save changes'}
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

export default EditButtonModal;