# HubSpot Mini-App

This is a React application designed to integrate with HubSpot, allowing users to display custom cards with dynamic buttons. These buttons can trigger various API actions, including interactions with HubSpot's CRM, using securely stored credentials and configurable API endpoints.

## Table of Contents

1.  [What the App Does](#what-the-app-does)
2.  [Features](#features)
3.  [Tech Stack](#tech-stack)
4.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Local Development Setup](#local-development-setup)
    *   [Supabase Setup (Backend)](#supabase-setup-backend)
        *   [1. Create Supabase Project](#1-create-supabase-project)
        *   [2. Database Schema](#2-database-schema)
        *   [3. Row Level Security (RLS)](#3-row-level-security-rls)
        *   [4. Database Functions for Encryption](#4-database-functions-for-encryption)
        *   [5. Auto-Update Profiles on Signup](#5-auto-update-profiles-on-signup)
        *   [6. Supabase Edge Functions](#6-supabase-edge-functions)
        *   [7. Environment Variables in Supabase](#7-environment-variables-in-supabase)
    *   [Frontend Environment Variables](#frontend-environment-variables)
5.  [How to Use the App](#how-to-use-the-app)
    *   [Authentication](#authentication)
    *   [Connecting to HubSpot](#connecting-to-hubspot)
    *   [Managing Cards and Buttons](#managing-cards-and-buttons)
    *   [Executing Button Actions](#executing-button-actions)
6.  [Project Structure](#project-structure)
7.  [Deployment](#deployment)

---

## What the App Does

This application serves as a customizable mini-app for HubSpot. It allows you to define "cards" which can contain a title, description, and an image. Each card can then have multiple "buttons" associated with it. These buttons are highly configurable: they can be linked to external API endpoints (including HubSpot's own APIs), specify HTTP methods (GET, POST, PUT, DELETE), and even include dynamic data from the current HubSpot object (like a contact's email or ID) in their URL queries or request bodies.

The app also handles secure storage of HubSpot OAuth credentials, allowing for token refresh and authenticated API calls to HubSpot.

## Features

*   **Customizable Cards:** Display information with titles, descriptions, and images.
*   **Dynamic Action Buttons:** Configure buttons to trigger external API calls.
*   **HubSpot Integration:** Seamlessly connect to HubSpot via OAuth to fetch contact/object data and make authenticated API calls.
*   **Secure Credential Storage:** HubSpot client IDs and secrets are encrypted and stored securely in Supabase.
*   **Token Refresh:** Automatically handles HubSpot access token refreshing when expired.
*   **Placeholder Support:** Use dynamic values (e.g., `{{contact.email}}`, `{{objectId}}`) in button API URLs and bodies.
*   **User Authentication:** Basic user sign-up and login powered by Supabase Auth.

## Tech Stack

*   **Frontend:** React, TypeScript, React Router
*   **Styling:** Tailwind CSS, Shadcn/ui components
*   **Backend/Database/Auth:** Supabase (PostgreSQL, Auth, Edge Functions)
*   **Icons:** Lucide React
*   **State Management/Data Fetching:** React Query

## Getting Started

Follow these steps to get your application up and running.

### Prerequisites

*   Node.js (v18 or higher)
*   npm or yarn
*   A Supabase account and project

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-app-name>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Create a `.env` file:**
    Create a file named `.env` in the root of your project and add the following environment variables. You will get these values from your Supabase project (see [Supabase Setup](#supabase-setup-backend)).

    ```env
    VITE_SUPABASE_URL="https://qeuaqcgiriahfwwzenqw.supabase.co"
    VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldWFxY2dpcmlhaGZ3d3plbnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjEyNDAsImV4cCI6MjA4NTUzNzI0MH0.uU3tCR1KbR1Zb5kCFrdk4R2k1hqT4q8FSPb1y5AE90g"
    ```
4.  **Start the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The app should now be running on `http://localhost:8080`.

### Supabase Setup (Backend)

This application heavily relies on Supabase for authentication, database storage, and serverless Edge Functions.

#### 1. Create Supabase Project

If you don't have one, create a new project on [Supabase](https://app.supabase.com/). Note down your **Project URL** and **Anon Key** from your project settings -> API. These will be used in your `.env` file.

#### 2. Database Schema

You need to set up the following tables in your Supabase project's SQL Editor.

**`profiles` table (for user profiles)**

```sql
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  PRIMARY KEY (id)
);
```

**`client` table (for HubSpot integration credentials)**

```sql
CREATE TABLE public.client (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    contacts TEXT NOT NULL,
    "accessToken" TEXT,
    "sessionID" TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    hub_id VARCHAR,
    hubspot_client_id TEXT, -- Changed from BYTEA to TEXT
    hubspot_client_secret TEXT -- Changed from BYTEA to TEXT
);

ALTER TABLE public.client ADD CONSTRAINT client_pkey PRIMARY KEY (id);
ALTER TABLE public.client ADD CONSTRAINT unique_user_hub_id UNIQUE (user_id, hub_id);
ALTER TABLE public.client ADD CONSTRAINT client_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

**`cards` table (for displaying content)**

```sql
CREATE TABLE public.cards (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.cards ADD CONSTRAINT cards_pkey PRIMARY KEY (id);
```

**`buttons` table (for actions within cards)**

```sql
CREATE TABLE public.buttons (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    card_id UUID NOT NULL,
    button_text TEXT NOT NULL,
    api_url TEXT,
    button_style JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    queries JSONB DEFAULT '[]'::jsonb,
    api_method TEXT DEFAULT 'POST'::text NOT NULL,
    api_body_template TEXT
);

ALTER TABLE public.buttons ADD CONSTRAINT buttons_pkey PRIMARY KEY (id);
ALTER TABLE public.buttons ADD CONSTRAINT buttons_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;
```

**`query_params` table (if you need reusable query parameters, though currently integrated directly into buttons)**

```sql
CREATE TABLE public.query_params (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    default_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.query_params ADD CONSTRAINT query_params_pkey PRIMARY KEY (id);
ALTER TABLE public.query_params ADD CONSTRAINT query_params_name_key UNIQUE (name);
```

**`webhooks` table (for generic webhook configurations)**

```sql
CREATE TABLE public.webhooks (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    method TEXT DEFAULT 'POST'::text NOT NULL,
    headers JSONB DEFAULT '{}'::jsonb NOT NULL,
    body_template TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.webhooks ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);
```

#### 3. Row Level Security (RLS)

Enable RLS for the following tables and apply the policies:

**`profiles` RLS Policies**

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING ( true );
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK ( auth.uid() = id );
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING ( auth.uid() = id );
```

**`client` RLS Policies**

```sql
ALTER TABLE public.client ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert their own client data." ON public.client FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Allow authenticated users to update their own client data." ON public.client FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Allow authenticated users to view their own client data." ON public.client FOR SELECT USING ((auth.uid() = user_id));
```

**`cards` RLS Policies**

```sql
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can delete cards" ON public.cards FOR DELETE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can insert cards" ON public.cards FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can update cards" ON public.cards FOR UPDATE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can view cards" ON public.cards FOR SELECT USING ((auth.role() = 'authenticated'::text));
```

**`buttons` RLS Policies**

```sql
ALTER TABLE public.buttons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can delete buttons" ON public.buttons FOR DELETE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can insert buttons" ON public.buttons FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can update buttons" ON public.buttons FOR UPDATE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can view buttons" ON public.buttons FOR SELECT USING ((auth.role() = 'authenticated'::text));
-- This policy is also present in your dump, but might be redundant if the above are sufficient
-- CREATE POLICY "Public buttons are viewable by everyone." ON public.buttons FOR SELECT USING (true);
```

**`query_params` RLS Policies**

```sql
ALTER TABLE public.query_params ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can delete their own query_params." ON public.query_params FOR DELETE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can insert their own query_params." ON public.query_params FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can update their own query_params." ON public.query_params FOR UPDATE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Public query_params are viewable by authenticated users." ON public.query_params FOR SELECT USING ((auth.role() = 'authenticated'::text));
```

**`webhooks` RLS Policies**

```sql
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can delete their own webhooks." ON public.webhooks FOR DELETE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can insert their own webhooks." ON public.webhooks FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can update their own webhooks." ON public.webhooks FOR UPDATE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Public webhooks are viewable by authenticated users." ON public.webhooks FOR SELECT USING ((auth.role() = 'authenticated'::text));
```

#### 4. Database Functions for Encryption

These functions are used to encrypt and decrypt sensitive HubSpot client credentials stored in the `client` table.

```sql
-- Drop existing functions if they exist with different signatures
DROP FUNCTION IF EXISTS public.encrypt_secret(bytea, text);
DROP FUNCTION IF EXISTS public.encrypt_secret(text, text);
DROP FUNCTION IF EXISTS public.decrypt_secret(bytea, text);
DROP FUNCTION IF EXISTS public.decrypt_secret(text, text);

-- Recreate encrypt_secret function to return TEXT
CREATE OR REPLACE FUNCTION public.encrypt_secret(plain_text TEXT, key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    encrypted_data BYTEA;
BEGIN
    encrypted_data := pg_catalog.pgp_sym_encrypt(plain_text, key, 'cipher-algo=aes256');
    RETURN encode(encrypted_data, 'base64');
END;
$$;

-- Recreate decrypt_secret function to return TEXT
CREATE OR REPLACE FUNCTION public.decrypt_secret(encrypted_data TEXT, key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    decoded_data BYTEA;
    decrypted_text TEXT;
BEGIN
    decoded_data := decode(encrypted_data, 'base64');
    decrypted_text := pg_catalog.pgp_sym_decrypt(decoded_data, key);
    RETURN decrypted_text;
END;
$$;

-- Grant permissions to the functions
GRANT EXECUTE ON FUNCTION public.encrypt_secret(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_secret(TEXT, TEXT) TO service_role;
```

#### 5. Auto-Update Profiles on Signup

This trigger automatically creates a `profile` entry for new users.

```sql
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name');
  RETURN new;
END;
$$;

-- Trigger the function on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

#### 6. Supabase Edge Functions

You need to deploy the following Edge Functions to your Supabase project. The code for these functions is located in the `supabase/functions` directory in your project.

*   **`get-all-buttons`**: Fetches all configured buttons and their associated card details.
*   **`execute-button-action`**: Executes the API call defined by a button, handling HubSpot token refresh and dynamic placeholder replacement.
*   **`save-client-credentials`**: Securely saves encrypted HubSpot client credentials to the `client` table.
*   **`install-hubspot`**: Initiates the HubSpot OAuth flow, redirecting the user to HubSpot for authorization.
*   **`oauth-callback-hubspot`**: Handles the callback from HubSpot after OAuth authorization, exchanges the code for tokens, and saves them securely.

**Important:** When deploying these functions, ensure that the `HUBSPOT_REDIRECT_URI` in `install-hubspot` and `oauth-callback-hubspot` points to the *actual deployed URL* of your `oauth-callback-hubspot` Edge Function. For example: `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/oauth-callback-hubspot`.

#### 7. Environment Variables in Supabase

Go to your Supabase project settings -> Edge Functions -> Configuration -> Secrets and add the following secrets:

*   `SUPABASE_URL`: Your Supabase project URL (e.g., `https://qeuaqcgiriahfwwzenqw.supabase.co`)
*   `SUPABASE_ANON_KEY`: Your Supabase project Anon Key
*   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase project Service Role Key (found under Project Settings -> API -> Project API keys)
*   `ENCRYPTION_KEY`: A strong, random string used for encrypting/decrypting sensitive data (e.g., HubSpot client secrets). Generate a long, random string for this.
*   `HUBSPOT_CLIENT_ID`: Your HubSpot Developer App's Client ID (if you want to use a default for all clients, otherwise it's stored per client).
*   `CLIENT_SECRET`: Your HubSpot Developer App's Client Secret (if you want to use a default for all clients, otherwise it's stored per client).

### Frontend Environment Variables

Ensure your local `.env` file (and your deployment environment variables) contain:

```env
VITE_SUPABASE_URL="https://qeuaqcgiriahfwwzenqw.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldWFxY2dpcmlhaGZ3d3plbnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjEyNDAsImV4cCI6MjA4NTUzNzI0MH0.uU3tCR1KbR1Zb5kCFrdk4R2k1hqT4q8FSPb1y5AE90g"
```

## How to Use the App

### Authentication

1.  **Sign Up:** Navigate to the sign-up page (if implemented) or use a tool like Supabase Auth UI to create a new user.
2.  **Email Confirmation:** After signing up, check your email inbox (and spam folder) for a confirmation link from Supabase. Click this link to verify your account. You will not be able to log in until your email is confirmed.
3.  **Login:** Once your email is confirmed, you can log in using your email and password.

### Connecting to HubSpot

The application will likely have a UI to initiate the HubSpot OAuth flow. This involves:

1.  **Initiating OAuth:** The app will redirect you to HubSpot's authorization page.
2.  **Granting Permissions:** You will be prompted to grant the necessary permissions to your HubSpot account.
3.  **Callback:** HubSpot will redirect you back to your application (specifically, the `oauth-callback-hubspot` Edge Function), which will handle token exchange and save your HubSpot access and refresh tokens securely in the Supabase `client` table.

### Managing Cards and Buttons

Currently, the UI for managing cards and buttons is not explicitly defined in the provided files. You would typically interact with the `cards` and `buttons` tables directly via the Supabase dashboard or build an admin interface within your application to:

*   **Create Cards:** Add new entries to the `cards` table with a `title`, `description`, and `image_url`.
*   **Create Buttons:** For each card, add entries to the `buttons` table, specifying:
    *   `card_id`: The ID of the card this button belongs to.
    *   `button_text`: The text displayed on the button.
    *   `api_url`: The target API endpoint.
    *   `api_method`: HTTP method (GET, POST, PUT, DELETE).
    *   `api_body_template`: (For POST/PUT/PATCH) A JSON string template for the request body, supporting placeholders.
    *   `queries`: A JSON array of objects `[{ "key": "paramName", "value": "{{placeholder}}" }]` for GET request query parameters.

### Executing Button Actions

Once cards and buttons are configured, when a user interacts with a button in the UI, the `execute-button-action` Edge Function is invoked. This function:

1.  Fetches button details and associated HubSpot client credentials.
2.  Refreshes the HubSpot access token if it's expired.
3.  Fetches details of the relevant HubSpot object (e.g., contact) if `objectId` and `objectTypeId` are provided.
4.  Replaces placeholders in the `api_url` and `api_body_template` with dynamic data (e.g., `contact.email`, `objectId`, `hub_id`).
5.  Executes the configured API call to the external service or HubSpot.
6.  Returns the response to the frontend.

## Project Structure

The project follows a standard React application structure:

*   `src/`: Contains all source code.
    *   `src/App.tsx`: Main application component, defines React Router routes.
    *   `src/main.tsx`: Entry point for the React application.
    *   `src/pages/`: React components for different pages (e.g., `Index.tsx`, `NotFound.tsx`).
    *   `src/components/`: Reusable React components.
        *   `src/components/ui/`: Shadcn/ui components.
    *   `src/hooks/`: Custom React hooks.
    *   `src/lib/`: Utility functions and configurations.
    *   `src/integrations/supabase/`: Supabase client setup.
    *   `src/utils/`: General utility functions (e.g., toast notifications).
*   `supabase/functions/`: Contains the TypeScript source code for Supabase Edge Functions.
*   `public/`: Static assets.
*   `tailwind.config.ts`, `postcss.config.js`, `globals.css`: Tailwind CSS configuration and global styles.

## Deployment

To deploy this application (e.g., to Netlify, Vercel, or other hosting providers):

1.  **Build the application:**
    ```bash
    npm run build
    # or
    yarn build
    ```
2.  **Configure Environment Variables:** Ensure that the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables are set in your hosting provider's settings.
3.  **Deploy Edge Functions:** Supabase Edge Functions are deployed directly through the Supabase CLI or dashboard. Ensure they are up-to-date and correctly linked to your project.