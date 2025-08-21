"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">HubSpot App</Link>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Button variant="ghost" asChild>
                <Link to="/">Install App</Link>
              </Button>
            </li>
            <li>
              <Button variant="ghost" asChild>
                <Link to="/contacts">Contacts</Link>
              </Button>
            </li>
            <li>
              <Button variant="ghost" asChild>
                <Link to="/thank-you">Thank You</Link>
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;