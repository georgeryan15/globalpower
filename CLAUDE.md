# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GlobalPowerStations is a Next.js 16 web application using React 19, HeroUI component library, Tailwind CSS v4, and TypeScript. The main application code is in the `globalpower/` subdirectory.

This app is designed to be a fairly simple online directory that maps all of the power plants in the world on an interactive map. It displays key data about them including output, fuel, type, construction date, owner .etc

It is somewhat similar to: https://app.electricitymaps.com/map/live/fifteen_minutes

## Commands

All commands should be run from the `globalpower/` directory:

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

- **Framework**: Next.js 16 App Router with server components by default
- **UI**: HeroUI v2 component library with Framer Motion animations
- **Styling**: Tailwind CSS v4 via PostCSS, with HeroUI plugin configured in `app/hero.ts`
- **Path alias**: `@/*` maps to the project root for imports

### Directory Structure

```
globalpower/
├── app/           # Next.js App Router - pages, layouts, and components
│   ├── layout.tsx # Root layout (Geist font, HeroUIProvider wrapper)
│   ├── page.tsx   # Home page
│   ├── globals.css# Tailwind base styles + HeroUI theme
│   └── hero.ts    # HeroUI plugin configuration
├── public/        # Static assets
└── [config files] # next.config.ts, tsconfig.json, eslint.config.mjs
```

## Configuration Notes

- TypeScript strict mode is enabled
- ESLint uses flat config format (v9) with Next.js core-web-vitals and TypeScript rules
- No test framework is currently configured

## Styling & Design

- Always use HeroUI UI elements to build out UI
- If custom components are needed it should use HeroUI components where possible
- Only use custom designed components if absolutely needed
- UI "design" is identical to that of mapbox - clear buttons, rounded edges .etc
