# Prelyct Votes

A voting platform built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Add your Supabase credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Authentication**: Sign in/sign up with email and password
- **Dashboard**: Protected dashboard with sidebar navigation
- **Elections Management**: Create and manage elections
- **Voting Interface**: Public voting page for voters
- **Results**: View election results

## Project Structure

```
app/
  auth/
    sign-in/        # Sign in page
    sign-up/        # Sign up page
  dashboard/
    layout.tsx      # Dashboard layout with sidebar
    page.tsx        # Dashboard home
    votes/
      page.tsx      # Elections list
      new/          # Create election
      [id]/         # Election details
    settings/       # Settings page
  vote/
    [electionId]/   # Public voting page
components/
  Button.tsx        # Reusable button component
  Card.tsx          # Card component
  Badge.tsx         # Badge component
  Table.tsx         # Table component
  ProtectedRoute.tsx # Route protection wrapper
lib/
  supabaseClient.ts # Supabase client setup
  mockAuth.ts       # Mock auth for development
```

## Notes

- The app uses mock authentication if Supabase credentials are not provided
- All database operations are currently mocked (console.log)
- Connect real Supabase tables later for full functionality

