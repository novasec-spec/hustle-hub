# Hustle Hub

All-in-one workspace for freelancers and creators.

- **Client CRM**: leads, active and past clients, with billed and outstanding totals
- **Invoices**: create, mark sent or paid (paid invoices log income automatically), print or save as PDF
- **Project boards**: kanban per project with priorities, due dates and drag and drop
- **Content calendar**: month view plus a pipeline for YouTube, TikTok and Instagram
- **Notes** (autosave) and **private file storage** (Supabase Storage)
- **Finance dashboard**: income vs expenses, spending by category, profit margin
- **AI helper**: captions, proposals, client emails (Vercel AI Gateway)

## Stack
Next.js 16 (App Router), Supabase (Auth, Postgres with RLS, Storage), Tailwind v4, Recharts, AI SDK + Vercel AI Gateway, Ionicons via react-icons.

## Setup
```bash
cp .env.example .env.local   # fill in Supabase URL and publishable key
npm install
npm run dev
```
Database schema: `supabase/migrations/0001_hustle_hub.sql`. All tables are `hh_`-prefixed and row-level secured per user.

On Vercel, the AI helper authenticates to AI Gateway with the project's OIDC token. Locally, set `AI_GATEWAY_API_KEY`.
