"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useSession } from "@/components/auth/SessionContextProvider.jsx";
import { useQuery } from "@tanstack/react-query";
import { supabase, supabaseAnonKey } from "@/integrations/supabase/client.js";
import { showError, showSuccess } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const fetchCardsWithButtons = async () => {
  const { data, error } = await supabase
    .from("cards")
    .select("*, buttons(*, execute_action_url)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const Index = () => {
  console.log("Index component is rendering!");
  const { user } = useSession();

  const {
    data: cards,
    isLoading: isLoadingCards,
    isError: isErrorCards,
    error: cardsError,
  } = useQuery({
    queryKey: ["publicCards"],
    queryFn: fetchCardsWithButtons,
  });

  React.useEffect(() => {
    if (isErrorCards) {
      showError("Failed to load content: " + cardsError.message);
    }
  }, [isErrorCards, cardsError]);

  const handleInstallClick = () => {
    const clientId = uuidv4();
    const statePayload = { client_id: clientId };

    if (user) {
      statePayload.user_id = user.id;
    }

    window.location.href = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/install-hubspot?client_id=${clientId}&state=${encodeURIComponent(JSON.stringify(statePayload))}`;
  };

  const handleButtonClick = async (button) => {
    try {
      showSuccess(`Executing button action: ${button.button_text}...`);
      
      const executeActionUrl = button.execute_action_url;

      if (!executeActionUrl) {
        throw new Error("Execute action URL not found for this button.");
      }

      // IMPORTANT: For the public Index page, we need to decide which hub_id to use.
      // For now, we'll use a placeholder. In a real scenario, this would come from
      // a user's selection or a default connected account.
      // For demonstration, let's try to fetch the first connected hub_id for the current user if logged in.
      let targetHubId = '23424'; // Default placeholder

      if (user) {
        const { data: clientData, error: clientError } = await supabase
          .from('client')
          .select('hub_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        
        if (clientData) {
          targetHubId = clientData.hub_id;
        } else if (clientError && clientError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error fetching user\'s hub_id for button execution:', clientError);
          showError('Could not determine HubSpot account for button action. Please connect an account.');
          return;
        }
      }


      const dynamicDataForExecution = {
        button_id: button.id,
        objectId: '5454', // Example: Replace with actual object ID from context
        objectTypeId: '0-1', // Example: Replace with actual object Type ID (e.g., '0-1' for contacts)
        hub_id: targetHubId, // Use the determined hub_id
      };

      const response = await fetch(executeActionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify(dynamicDataForExecution),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute button action');
      }

      const result = await response.json();
      showSuccess(`Button "${button.button_text}" executed successfully!`);
      console.log('Button action response:', result);
    } catch (error) {
      showError(`Error executing button "${button.button_text}": ${error.message}`);
      console.error('Button action error:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Updated Hero Section with Banner Image */}
      <section
        className="relative w-full h-[500px] bg-cover bg-center flex items-center justify-center text-white p-8"
        style={{ backgroundImage: `url('https://cdn.pixabay.com/photo/2017/05/31/11/17/office-2360063_1280.jpg')` }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative z-10 text-center max-w-3xl">
          <h1 className="text-5xl font-bold mb-4">
            Welcome to Our HubSpot Integration App!
          </h1>
          <p className="text-xl mb-8">
            Seamlessly connect your HubSpot account to unlock powerful features and
            streamline your workflow. Get ready to enhance your contact management
            and deal tracking with our intuitive solution.
          </p>
          <Button
            size="lg"
            className="px-8 py-3 text-lg flex items-center bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleInstallClick}
          >
            <Download className="mr-2 h-5 w-5" />
            Install App
          </Button>
        </div>
      </section>

      {/* Dynamic Cards Section */}
      <section className="py-16 bg-background w-full">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Features</h2>
          {isLoadingCards ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-48 w-full bg-gray-200 rounded-md mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-10 bg-gray-200 rounded w-1/2 mt-4 mx-auto"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isErrorCards ? (
            <div className="text-center text-red-500">
              <p>Error loading features: {cardsError?.message}</p>
            </div>
          ) : cards?.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No features configured yet. Please add cards from the admin panel.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {cards?.map((card) => (
                <Card key={card.id} className="rounded-lg overflow-hidden shadow-lg bg-card text-card-foreground flex flex-col">
                  {card.image_url && (
                    <img
                      src={card.image_url}
                      alt={card.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">{card.title}</CardTitle>
                    {card.description && <CardDescription className="text-muted-foreground">{card.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col justify-end">
                    <div className="flex flex-wrap gap-2 mt-4">
                      {card.buttons && card.buttons.length > 0 ? (
                        card.buttons.map((button) => (
                          <Button
                            key={button.id}
                            onClick={() => handleButtonClick(button)}
                            className="px-4 py-2"
                          >
                            {button.button_text}
                          </Button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No actions available.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New Feature Section 1: Image Left, Text Right */}
      <section
        className="py-16 bg-secondary w-full"
      >
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <img
              src="https://cdn.pixabay.com/photo/2015/01/08/18/29/entrepreneur-593358_1280.jpg"
              alt="Streamlined Workflow"
              className="w-full h-auto rounded-lg shadow-lg object-cover"
            />
          </div>
          <div className="md:w-1/2 text-secondary-foreground text-center md:text-left">
            <h2 className="text-4xl font-bold mb-4">Streamlined Workflow</h2>
            <p className="text-lg mb-6">
              Our application is designed to simplify your daily tasks. With a clear overview of your HubSpot data, you can make informed decisions faster and keep your sales pipeline moving efficiently.
            </p>
            <Button variant="outline" className="text-secondary-foreground border-secondary-foreground hover:bg-secondary-foreground hover:text-secondary">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* New Feature Section 2: Full-width Image with Text Overlay */}
      <section
        className="relative w-full h-[400px] bg-cover bg-center flex items-center justify-center text-white p-8 my-16"
        style={{ backgroundImage: `url('https://cdn.pixabay.com/photo/2024/06/16/12/34/ai-generated-8833306_960_720.png')` }}
      >
        <div className="absolute inset-0 bg-primary opacity-60"></div>
        <div className="relative z-10 text-center max-w-2xl">
          <h2 className="text-4xl font-bold mb-4">Powerful Analytics</h2>
          <p className="text-lg">
            Gain deeper insights into your customer interactions and campaign performance. Our integration provides the data you need to optimize your strategies.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Index;