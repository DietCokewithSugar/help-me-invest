# AI Investment Research (help-me-invest)

Single Next.js 14 application with API routes serving as the backend. No Docker, no multi-service setup.

## Cursor Cloud specific instructions

### Services

| Service | Type | Notes |
|---------|------|-------|
| Next.js App | Local | `npm run dev` on port 3000 (frontend + API routes) |
| FMP API | External SaaS | Requires `FMP_API_KEY` env var |
| Google Gemini | External SaaS | Requires `GOOGLE_API_KEY` env var |
| Supabase | External SaaS (optional) | Requires `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; app degrades gracefully without it |

### Environment variables

All secrets are injected via Cloud Agent secrets. A `.env.local` must be created from them for Next.js to pick up `NEXT_PUBLIC_*` vars at dev/build time:

```bash
python3 -c "
import os
vars = ['FMP_API_KEY','GOOGLE_API_KEY','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SUPABASE_ANON_KEY']
with open('.env.local','w') as f:
    for v in vars:
        f.write(f'{v}={os.environ.get(v,\"\")}\n')
"
```

### Key commands

- **Dev server**: `npm run dev` (port 3000)
- **Lint**: `npm run lint` (requires `.eslintrc.json` with `"extends": "next/core-web-vitals"`)
- **Build**: `npm run build` (ESLint ignored during builds via `next.config.js`)
- **TypeScript check**: `npx tsc --noEmit`

### Gotchas

- The repo ships without `.eslintrc.json`; first `npm run lint` prompts interactively. The `.eslintrc.json` with `next/core-web-vitals` must exist before running lint.
- ESLint v8 is required (not v9) for Next.js 14.2. Install `eslint@^8` and `eslint-config-next@14.2.35`.
- Pre-existing lint errors (`react/no-unescaped-entities`) cause `npm run build` to fail unless `eslint.ignoreDuringBuilds: true` is set in `next.config.js`.
- There are no automated tests in this repo (`package.json` has no test script).
- The 3D globe on the landing page uses Three.js / React Three Fiber and may show WebGL warnings in headless environments; this is cosmetic.
