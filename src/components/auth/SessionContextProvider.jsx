"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { showError } from '@/utils/toast';

const SessionContext = createContext(undefined);

export const SessionContextProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        if (location.pathname === '/login' || location.pathname === '/signup') {
          navigate('/admin/dashboard'); // This line handles the redirection
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        if (location.pathname.startsWith('/admin')) {
          navigate('/login');
        }
      } else if (event === 'INITIAL_SESSION') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
      } else if (event === 'AUTH_ERROR') {
        showError('Authentication error: ' + (currentSession?.message || 'Unknown error'));
      }
      setIsLoading(false);
    });

    // Initial check for session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return (
    <SessionContext.Provider value={{ session, user, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};