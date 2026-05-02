# Archive — File vault

A file vault web app for browsing, opening, downloading, and uploading files. Object data lives in **Cloudflare R2** (S3-compatible blob storage). Metadata and directory structure are tracked in a relational database via **Drizzle ORM**.

The UI is built with **Next.js** (App Router).

## Planned features

| Feature | Description |
|--------|-------------|
| **List directory** | Navigate folders and see files in the current path. |
| **Open file** | View or preview a file in the browser where supported. |
| **Download files** | Download a single file (and later, multi-select or archives if needed). |
| **Upload files** | Upload into the current directory, with progress and validation. |

## Architecture (high level)

- **R2** stores blobs (bytes). Keys or prefixes mirror logical paths; the app uses the R2 API for `list`, `get`, `put`, and signed or streaming downloads as appropriate.
- **Drizzle** models metadata the UI needs fast access to: paths, names, sizes, content types, upload times, parent folder relationships, and pointers to R2 object keys. The exact schema will evolve with the first implementation pass.

## Local development

```bash
npm install
npm run dev
```

Open [https://localhost:3000](https://localhost:3000) (this project runs the dev server with experimental HTTPS).

You will need environment variables for your database (used by Drizzle) and for R2 (account ID, access keys, bucket name, and optional custom domain or public URL). Add them to `.env` locally; do not commit secrets.

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Drizzle ORM](https://orm.drizzle.team/)
