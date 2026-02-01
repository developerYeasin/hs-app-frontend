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

const Index = () => {
  console.log("Index component is rendering!");
  const { user } = useSession();

  // Removed fetchCardsWithButtons and useQuery for publicCards as the section is being removed.
  // Removed handleButtonClick as it's no longer needed on the public page.

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
          {/* Removed the "Install App" button */}
        </div>
      </section>

      {/* Removed Dynamic Cards Section ("Our Features") */}

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