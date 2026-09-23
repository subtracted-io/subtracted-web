# Subtracted

A small, static website for Subtracted, built with Vite, vanilla HTML/CSS/JavaScript, and Tailwind CSS.

## Development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

## Checks and production build

```sh
npm test
npm run build
npm run preview
```

Production files are generated in `dist/`. No environment variables or application secrets are required.

## Deployment

GitHub Actions tests, builds, and deploys pushes to `main` to https://subtracted-io.github.io/subtracted-web/. Pull requests run checks without publishing. The workflow builds with Vite base `/subtracted-web/`; local development uses `/`.
