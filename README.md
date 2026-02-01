# HubSpot Integration App

## Overview

This application serves as a powerful integration tool for HubSpot, allowing users to extend HubSpot's CRM functionality with custom cards and dynamic action buttons. It provides an administrative interface where users can define custom cards, associate buttons with them, and configure these buttons to trigger external API calls (webhooks) with dynamic data from HubSpot contacts or other objects.

**Key Features:**

*   **Admin Panel:** A secure, authenticated dashboard for managing your HubSpot integrations.
*   **HubSpot Account Management:** Connect multiple HubSpot accounts securely using OAuth or manual credential entry.
*   **Dynamic Card Creation:** Define custom cards with titles, descriptions, and images that can be displayed within HubSpot CRM.
*   **Configurable Action Buttons:** Attach buttons to your custom cards, each configured with a specific API URL, HTTP method (GET, POST, PUT, DELETE, PATCH), and dynamic payload/query parameters.
*   **Dynamic Placeholders:** Utilize placeholders like `{{contact.property}}`, `{{objectId}}`, `{{objectTypeId}}`, `{{hub_id}}`, and `{{button_id}}` in API URLs, query parameters, and request bodies to send context-rich data from HubSpot.
*   **Secure Credential Storage:** HubSpot Client IDs and Secrets are encrypted and stored securely in Supabase.
*   **Automated Token Refresh:** Access tokens for HubSpot are automatically refreshed using stored refresh tokens and client credentials.
*   **Edge Function Powered:** Leverages Supabase Edge Functions for secure server-side logic, token management, and API interactions.

## Tech Stack

*   **Frontend:** React, TypeScript, React Router
*   **Styling:** Tailwind CSS, shadcn/ui components
*   **Backend/Database/Auth:** Supabase (PostgreSQL, Auth, Edge Functions)
*   **Icons:** Lucide React
*   **State Management/Data Fetching:** React Query
*   **Forms:** React Hook Form, Zod (for validation)
*   **Utility:** `clsx`, `tailwind-merge`, `react-select`, `sonner` (for toasts)

## Getting Started

Follow these steps to get your HubSpot Integration App up and running.

### Prerequisites

*   Node.js (v18 or higher)
*   npm or Yarn
*   A Supabase account (free tier is sufficient for development)
*   A HubSpot Developer Account (to create a private app and get API credentials)

### 1. Clone the Repository

You already have the codebase.

### 2. Install Dependencies

Navigate to the project root and install the required npm packages:

```bash
npm install
# or
yarn install
```

### 3. Supabase Setup

This application heavily relies on Supabase for authentication, database storage, and serverless functions.

#### a. Create a Supabase Project

1.  Go to [Supabase](https://app.supabase.com/) and create a new project.
2.  Note down your **Project ID** (e.g., `qeuaqcgiriahfwwzenqw`). This will be used in your environment variables.

#### b. Configure Environment Variables

You need to set up environment variables for both your frontend and your Supabase Edge Functions.

**For Frontend (`.env` file in your project root):**

Create a `.env` file in the root of your project and add the following:

```env
VITE_SUPABASE_URL="https://qeuaqcgiriahfwwzenqw.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldWFxY2dpcmlhaGZ3d3plbnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjEyNDAsImV4cCI6MjA4NTUzNzI0MH0.uU3tCR1KbR1Zb5kCFrdk4R2k1hqT4q8FSPb1y5AE90g"
```

*   Replace `https://qeuaqcgiriahfwwzenqw.supabase.co` with your actual Supabase project URL.
*   Replace the `VITE_SUPABASE_ANON_KEY` with your actual Supabase "anon" (public) key.

**For Supabase Edge Functions (Supabase Dashboard -> Edge Functions -> Configuration -> Secrets):**

You need to set these secrets in your Supabase project dashboard.

*   `SUPABASE_URL`: Your Supabase project URL (e.g., `https://qeuaqcgiriahfwwzenqw.supabase.co`).
*   `SUPABASE_ANON_KEY`: Your Supabase "anon" (public) key.
*   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase "service_role" key (found under Project Settings -> API). This key has elevated privileges and should **never** be exposed in your frontend.
*   `ENCRYPTION_KEY`: A strong, random string used to encrypt sensitive HubSpot client credentials in your database. You can generate one using a tool like `openssl rand -base64 32`.
*   `HUBSPOT_CLIENT_ID`: Your HubSpot App's Client ID (obtained from HubSpot Developer Account, see step 4).
*   `CLIENT_SECRET`: Your HubSpot App's Client Secret (obtained from HubSpot Developer Account, see step 4).

#### c. Database Schema (SQL Migrations)

Execute the following SQL commands in your Supabase SQL Editor (SQL tab in the dashboard) to set up your database tables, functions, and Row Level Security (RLS) policies.

**1. Create `profiles` Table (for user profiles)**

This table stores additional user information and is linked to Supabase Auth.

<dyad-execute-sql description="Create profiles table in public schema">
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  PRIMARY KEY (id)
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles for select using ( true );

create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );

create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );
</dyad-execute-sql>

**2. Create `client` Table (for HubSpot client credentials and tokens)**

This table stores the HubSpot `hub_id`, `accessToken`, `refreshToken`, and the encrypted `hubspot_client_id` and `hubspot_client_secret` for each connected HubSpot account.

<dyad-execute-sql description="Create client table in public schema">
CREATE TABLE public.client (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    contacts text NOT NULL,
    "accessToken" text,
    "sessionID" text,
    refresh_token text,
    expires_at timestamp with time zone,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE,
    hub_id character varying,
    hubspot_client_id text,
    hubspot_client_secret text,
    PRIMARY KEY (id)
);

ALTER TABLE public.client ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX unique_user_hub_id ON public.client (user_id, hub_id);

CREATE POLICY "Allow authenticated users to insert their own client data." ON public.client FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Allow authenticated users to update their own client data." ON public.client FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Allow authenticated users to view their own client data." ON public.client FOR SELECT USING ((auth.uid() = user_id));
</dyad-execute-sql>

**3. Create `cards` Table**

This table stores the definition of custom cards.

<dyad-execute-sql description="Create cards table in public schema">
CREATE TABLE public.cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert cards" ON public.cards FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can update cards" ON public.cards FOR UPDATE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can delete cards" ON public.cards FOR DELETE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can view cards" ON public.cards FOR SELECT USING ((auth.role() = 'authenticated'::text));
</dyad-execute-sql>

**4. Create `buttons` Table**

This table stores the definition of action buttons associated with cards.

<dyad-execute-sql description="Create buttons table in public schema">
CREATE TABLE public.buttons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_id uuid REFERENCES public.cards(id) ON DELETE CASCADE NOT NULL,
    button_text text NOT NULL,
    api_url text NOT NULL,
    api_method text DEFAULT 'POST'::text NOT NULL,
    api_body_template text,
    queries jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.buttons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert buttons" ON public.buttons FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can update buttons" ON public.buttons FOR UPDATE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can delete buttons" ON public.buttons FOR DELETE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can view buttons" ON public.buttons FOR SELECT USING ((auth.role() = 'authenticated'::text));
</dyad-execute-sql>

**5. Create `query_params` Table (if needed for predefined query parameters)**

This table is used to store predefined query parameters that can be selected when creating buttons.

<dyad-execute-sql description="Create query_params table in public schema">
CREATE TABLE public.query_params (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL UNIQUE,
    description text,
    default_value text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

ALTER TABLE public.query_params ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert their own query_params." ON public.query_params FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can update their own query_params." ON public.query_params FOR UPDATE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can delete their own query_params." ON public.query_params FOR DELETE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Public query_params are viewable by authenticated users." ON public.query_params FOR SELECT USING ((auth.role() = 'authenticated'::text));
</dyad-execute-sql>

**6. Create `webhooks` Table (already exists, but ensure RLS)**

This table is for general webhooks, currently used by `simulate-email-webhook`.

<dyad-execute-sql description="Ensure RLS for webhooks table">
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert their own webhooks." ON public.webhooks FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can update their own webhooks." ON public.webhooks FOR UPDATE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can delete their own webhooks." ON public.webhooks FOR DELETE USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Public webhooks are viewable by authenticated users." ON public.webhooks FOR SELECT USING ((auth.role() = 'authenticated'::text));
</dyad-execute-sql>

**7. Create Encryption/Decryption Functions**

These functions are used by Edge Functions to securely store and retrieve HubSpot client credentials.

<dyad-execute-sql description="Create encrypt_secret function">
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

GRANT EXECUTE ON FUNCTION public.encrypt_secret(TEXT, TEXT) TO service_role;
</dyad-execute-sql>

<dyad-execute-sql description="Create decrypt_secret function">
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

GRANT EXECUTE ON FUNCTION public.decrypt_secret(TEXT, TEXT) TO service_role;
</dyad-execute-sql>

**8. Create `handle_new_user` Trigger**

This trigger automatically creates a profile entry for new users.

<dyad-execute-sql description="Create function to insert profile when user signs up">
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
</dyad-execute-sql>

#### d. Deploy Supabase Edge Functions

The application uses several Supabase Edge Functions for secure server-side operations, including HubSpot OAuth, token management, and executing button actions. These functions are already in your `supabase/functions` directory. They will be deployed automatically when you make changes to them.

Ensure the following functions are present and correctly configured (their content is already in your codebase):

*   `supabase/functions/install-hubspot/index.ts`
*   `supabase/functions/oauth-callback-hubspot/index.ts`
*   `supabase/functions/save-client-credentials/index.ts`
*   `supabase/functions/execute-button-action/index.ts`
*   `supabase/functions/get-all-buttons/index.ts`
*   `supabase/functions/simulate-email-webhook/index.ts` (Example webhook)

### 4. HubSpot App Setup

You need to create a private app in your HubSpot Developer Account to get the necessary Client ID and Client Secret for OAuth.

1.  **Log in to your HubSpot Developer Account:** Go to [developers.hubspot.com](https://developers.hubspot.com/).
2.  **Create a Private App:**
    *   Navigate to "Apps" -> "Private Apps".
    *   Click "Create a private app".
    *   Give your app a name (e.g., "My Dyad Integration App").
    *   Go to the "Auth" tab.
    *   Note down your **Client ID** and **Client Secret**. You will use these for the `HUBSPOT_CLIENT_ID` and `CLIENT_SECRET` environment variables in Supabase.
    *   Add the following **Redirect URL** for OAuth:
        `https://qeuaqcgiriahfwwzenqw.supabase.co/functions/v1/oauth-callback-hubspot`
        (Replace `qeuaqcgiriahfwwzenqw.supabase.co` with your actual Supabase project URL).
    *   Under "Scopes", ensure you add at least `crm.objects.contacts.read` for the app to function correctly. You might need more scopes depending on the HubSpot data you wish to interact with.
    *   Publish your app.

### 5. Run the Application

Once all Supabase and HubSpot configurations are complete, you can run your application locally:

```bash
npm run dev
# or
yarn dev
```

The application should now be accessible in your browser, typically at `http://localhost:8080`.

## How to Use the App

### 1. Admin Panel Access

*   **Sign Up:** Navigate to `/signup` in your application. Create a new user account.
*   **Email Confirmation:** After signing up, you will receive a confirmation email from Supabase. Click the link in this email to verify your account.
*   **Login:** Once your email is confirmed, go to `/login` and log in with your new credentials. You will be redirected to the Admin Dashboard.

### 2. Connecting HubSpot Accounts

From the Admin Dashboard, navigate to "Client Accounts" in the sidebar.

*   **Manual Entry:**
    *   Click "Connect New Account".
    *   Enter your HubSpot **Hub ID**, **HubSpot App Client ID**, and **HubSpot App Client Secret** (from your HubSpot Private App).
    *   Click "Add Manually".
    *   After adding, you **must** click the "Connect via OAuth" button (refresh icon) next to the newly added account in the table. This will initiate the OAuth flow to obtain `accessToken` and `refreshToken` for that specific HubSpot account.
*   **OAuth Flow:**
    *   If you click "Connect via OAuth" directly (e.g., for an existing entry or if you were to add an OAuth button on the public page), you will be redirected to HubSpot to grant permissions.
    *   After granting permissions, you will be redirected back to your app's `/thank-you` page, and the HubSpot account's tokens will be updated in your Supabase `client` table.

### 3. Managing Cards

From the Admin Dashboard, navigate to "Manage Cards" in the sidebar.

*   **Add New Card:** Click "Add New Card" (currently disabled, but this is where it would be). Fill in the title, description, and an optional image URL.
*   **Edit/View/Delete Cards:** Use the action buttons in the table to modify, view details, or remove existing cards.

### 4. Managing Buttons

From the Admin Dashboard, navigate to "Manage Buttons" in the sidebar.

*   **Add New Button:** Click "Add New Button".
    *   **Select Card:** Choose which card this button will be associated with.
    *   **Button Text:** The text displayed on the button.
    *   **Webhook API URL:** The external API endpoint this button will call.
    *   **API Method:** Select the HTTP method (GET, POST, PUT, DELETE, PATCH).
    *   **Query Parameters (for GET):** Add key-value pairs. You can choose "Static Value" or "Contact Property" for the value. If "Contact Property", select from the suggested HubSpot contact properties.
    *   **API Body Template (for POST/PUT/PATCH):** Provide a JSON body template.
    *   **Dynamic Placeholders:** You can use the following placeholders in your API URL, query parameters, and API body template:
        *   `{{contact.property}}`: Replaced with the value of a specific HubSpot contact property (e.g., `{{contact.email}}`, `{{contact.firstname}}`).
        *   `{{objectId}}`: Replaced with the ID of the HubSpot object (e.g., contact ID).
        *   `{{objectTypeId}}`: Replaced with the type ID of the HubSpot object (e.g., `0-1` for contacts).
        *   `{{hub_id}}`: Replaced with the HubSpot Hub ID of the connected account.
        *   `{{button_id}}`: Replaced with the unique ID of the button being clicked.
*   **Edit/View/Delete Buttons:** Use the action buttons in the table to modify, view details, or remove existing buttons.

### 5. Interacting with HubSpot CRM

Once cards and buttons are configured in the admin panel and a HubSpot account is connected:

*   **Custom CRM Cards:** The custom cards you define will appear within the HubSpot CRM (e.g., on a contact's record page) as a custom extension.
*   **Triggering Actions:** When a user clicks one of your configured buttons within HubSpot, the associated Edge Function (`execute-button-action`) will be invoked. This function will:
    1.  Fetch the button's configuration.
    2.  Refresh the HubSpot access token if expired.
    3.  Fetch details of the HubSpot object (e.g., contact) from which the button was clicked.
    4.  Replace all dynamic placeholders in the API URL, query parameters, and body template with actual data.
    5.  Execute the external API call (webhook) with the prepared data.

## Deployment

When deploying your application to a hosting provider (e.g., Netlify, Vercel), ensure that you set the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in their respective configuration settings. The Supabase Edge Function secrets are managed directly within your Supabase project.

## Troubleshooting

*   **`net::ERR_NAME_NOT_RESOLVED` or API errors:**
    *   Double-check that `VITE_SUPABASE_URL` in your local `.env` file (and deployment environment variables) is correctly set to your Supabase project URL (`https://qeuaqcgiriahfwwzenqw.supabase.co`).
    *   Verify that all Supabase Edge Functions have the correct Supabase project URL hardcoded where necessary (as updated in the previous step).
    *   Ensure your Supabase project is active and accessible.
*   **"Email not confirmed" on login:**
    *   Check the inbox (and spam/junk folders) of the email address used for signup for a confirmation link from Supabase. Click this link to verify your account.
    *   If no email is received, check your Supabase Auth settings for email templates and SMTP configuration.
*   **HubSpot OAuth/Token Errors:**
    *   Ensure your HubSpot Private App's Client ID, Client Secret, and Redirect URL are correctly configured in both HubSpot and your Supabase Edge Function secrets.
    *   Verify that the necessary scopes (e.g., `crm.objects.contacts.read`) are granted to your HubSpot Private App.
    *   Check Supabase Edge Function logs for `install-hubspot` and `oauth-callback-hubspot` for detailed error messages.
*   **Button Action Failures:**
    *   Check the `execute-button-action` Edge Function logs in Supabase for any errors during token refresh, HubSpot object fetching, or the external API call.
    *   Ensure the `ENCRYPTION_KEY` secret is correctly set in Supabase for decrypting HubSpot credentials.
    *   Verify the `api_url` and `api_method` for your buttons are correct and the external endpoint is reachable.
    *   Confirm that the JSON structure in `api_body_template` is valid and placeholders are correctly formatted.
