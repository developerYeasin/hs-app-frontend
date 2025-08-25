"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { v4 as uuidv4 } from "uuid"; // Import uuid for generating unique client_id

const Index = () => {
  const handleInstallClick = () => {
    const clientId = uuidv4(); // Generate a unique ID for this installation
    // Redirect to the install-hubspot edge function, passing the generated client_id
    window.location.href = `https://txfsspgkakryggiodgic.supabase.co/functions/v1/install-hubspot?client_id=${clientId}`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <h1 className="text-4xl font-bold mb-6 text-center">
        Welcome to Our HubSpot Integration App!
      </h1>
      <p className="text-lg text-gray-700 mb-8 text-center max-w-2xl">
        Seamlessly connect your HubSpot account to unlock powerful features and
        streamline your workflow. Get ready to enhance your contact management
        and deal tracking with our intuitive solution.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-4xl">
        <div className="rounded-lg overflow-hidden shadow-lg">
          <img
            src="https://media.istockphoto.com/id/2169549413/photo/puppy-and-kitten-cuddling.jpg?s=1024x1024&w=is&k=20&c=uwYJEO-LAa16OoGBtKVBWHDuZblkSQx4v6FZ5zPmymw="
            alt="Puppy and Kitten Cuddling"
            className="w-full h-64 object-cover"
          />
          <div className="p-4 bg-white">
            <h3 className="text-xl font-semibold mb-2">Easy Integration</h3>
            <p className="text-gray-600">
              Connect your HubSpot account in just a few clicks. Our secure
              process ensures your data is safe.
            </p>
          </div>
        </div>
        <div className="rounded-lg overflow-hidden shadow-lg">
          <img
            src="https://cdn.pixabay.com/photo/2025/08/03/15/10/cat-9752539_960_720.jpg"
            alt="Cat"
            className="w-full h-64 object-cover"
          />
          <div className="p-4 bg-white">
            <h3 className="text-xl font-semibold mb-2">
              Enhanced Productivity
            </h3>
            <p className="text-gray-600">
              Access your contacts and deal information directly, saving you
              time and effort.
            </p>
          </div>
        </div>
      </div>

      <Button
        size="lg"
        className="px-8 py-3 text-lg flex items-center"
        onClick={handleInstallClick}
      >
        <Download className="mr-2 h-5 w-5" />
        Install App
      </Button>
    </div>
  );
};

export default Index;