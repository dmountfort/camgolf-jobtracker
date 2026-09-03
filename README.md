# CAM Golf Admin Dashboard

The standalone web dashboard for reviewing CAM Golf field job cards and generating EZGO client reports.

## Vercel environment variables

Configure these in the Vercel project rather than committing a `.env` file:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`

Vercel detects the Next.js application automatically. Use Node.js 22.

## Local development

```bash
npm install
npm run dev
```
