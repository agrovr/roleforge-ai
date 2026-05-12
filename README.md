# RoleForge AI Frontend

A Next.js frontend for an AI-assisted resume tailoring workflow.

The app helps users upload a DOCX resume, add a job target, review backend-returned guidance, and export a tailored draft. Marketing copy intentionally avoids unsupported customer proof, performance statistics, third-party brand proof, vendor-specific ATS claims, and manual-review claims.

## Features

- Resume upload flow
- Job description text or public URL targeting
- Optional company URL context
- Fit, gap, formatting, generated resume, cover letter, interview prep, change log, warning, and history views when returned by the backend
- DOCX export flow
- Responsive RoleForge AI landing page and studio UI
- Disabled/coming-soon states for auth, premium billing, account settings, and feature gating

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- CSS / global styling

## Project Structure

```text
app/
  app/page.tsx                    # Main app workflow UI
  components/Brand.tsx            # RoleForge brand component
  components/ResumePreview.tsx    # Safe generic resume preview mockups
  components/RoleForgeIcons.tsx   # Inline UI icon set
  page.tsx                        # Landing page
  globals.css                     # Global styles and responsive layout
  layout.tsx                      # Root layout and metadata
```

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Backend Connection

Configure the public backend URL in local and deployed environments:

```env
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
```

The studio expects the backend to provide:

- `POST /upload`
- `POST /tailor`
- `POST /export`
- `GET /download/{filename}`

## Production Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Before enabling auth or billing, provide the auth provider, payment provider, price IDs, redirect URLs, backend endpoints, and entitlement rules.
