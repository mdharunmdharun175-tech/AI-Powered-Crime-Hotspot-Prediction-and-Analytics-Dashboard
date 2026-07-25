# CrimeScope AI 🚨 — AI-Powered Crime Analytics, Prediction & Hotspot Mapping

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF.svg?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.57.4-3ECF8E.svg?style=flat&logo=supabase)](https://supabase.com/)

**CrimeScope AI** is a state-of-the-art web application designed for real-time crime data analytics, predictive policing models, interactive geospatial hotspot detection, and AI-driven intelligence reporting. Built on modern web standards with premium glassmorphic UI design, dark/light mode support, and seamless Supabase integration.

---

## 🌟 Key Features

* **📊 Interactive Dashboard**: Real-time KPI summaries, recent incident trackers, and district-level risk indicators.
* **📈 Advanced Analytics**: Deep-dive statistical visualizations, crime trend analysis, and severity breakdowns using Chart.js.
* **🤖 AI Predictive Modeling**: Forecasting risk trajectories and predictive spatial analysis for proactive resource allocation.
* **🗺️ Geospatial Hotspot Mapping**: High-performance interactive maps with DBSCAN hotspot clustering, heatmaps, and customizable layer controls using Leaflet & React-Leaflet.
* **💡 Strategic AI Insights**: Automated intelligence summaries, risk mitigation recommendations, and anomaly detection.
* **📑 Automated Reports**: Exportable PDF/tabular analytical reports with custom filtering by date range, district, and severity.
* **🔐 Enterprise Security & Admin Control**: Built-in Supabase authentication with role-based access control and system governance.

---

## 🛠️ Tech Stack

* **Frontend Framework**: [React 18](file:///d:/zoho/zoho/package.json#L25) with [TypeScript](file:///d:/zoho/zoho/package.json#L44)
* **Build Tool**: [Vite](file:///d:/zoho/zoho/package.json#L46)
* **Styling**: [Tailwind CSS](file:///d:/zoho/zoho/package.json#L43) with custom design system tokens and glassmorphism utilities
* **Icons**: [Lucide React](file:///d:/zoho/zoho/package.json#L24)
* **Charts & Data Visualization**: [Chart.js](file:///d:/zoho/zoho/package.json#L17) & [react-chartjs-2](file:///d:/zoho/zoho/package.json#L26)
* **Maps & Geospatial**: [Leaflet](file:///d:/zoho/zoho/package.json#L22), [React-Leaflet](file:///d:/zoho/zoho/package.json#L28), and [leaflet.heat](file:///d:/zoho/zoho/package.json#L23)
* **Backend & Database**: [Supabase](file:///d:/zoho/zoho/package.json#L14) (PostgreSQL, Auth, Edge Functions)

---

## 🚀 Getting Started & Setup

### 1. Prerequisites
Ensure you have **Node.js** (v18 or higher) and **npm** installed on your system.

### 2. Installation
Clone the repository and install the project dependencies:

```bash
npm install
```

---

## 🔑 Environment Variables Configuration

Before running the application, you must configure your Supabase credentials. Create a `.env` file in the root directory (`d:/zoho/zoho/.env`) and add your project URL and anonymous API key:

```env
VITE_SUPABASE_URL=https://tmfcxzxfdbfqahhojqnj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtZmN4enhmZGJmcWFoaG9qcW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMTcyMDYsImV4cCI6MjA5ODc5MzIwNn0.R-1zIIGhoZf_8jaFCT9E6NM8a-Ga56E4oqbrtWReutY
```

> [!IMPORTANT]
> **How to obtain your Supabase keys:**
> 1. Log in to your [Supabase Dashboard](https://app.supabase.com/).
> 2. Select your project.
> 3. Navigate to **Project Settings** (gear icon) ➔ **API**.
> 4. Copy the **Project URL** and paste it as `VITE_SUPABASE_URL`.
> 5. Copy the `anon` / `public` API key and paste it as `VITE_SUPABASE_ANON_KEY`.

---

## ⚡ Running Commands

Below are the essential terminal commands for developing, testing, and building the application:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server locally with hot-module reload (HMR). Accessible at `http://localhost:5173`. |
| `npm run build` | Compiles and optimizes the TypeScript code and builds the production bundle into the `dist/` directory. |
| `npm run preview` | Boots up a local static preview server to test the production build generated in `dist/`. |
| `npm run lint` | Runs ESLint across the codebase to identify code style issues, potential bugs, and linting rules. |
| `npm run typecheck` | Executes TypeScript compiler checks (`tsc --noEmit`) to verify type safety across all components and services. |

### Example Usage: Starting the Dev Server

```bash
# Start development server
npm run dev
```

---

## 🗄️ Database Setup & Migrations

The project includes pre-configured SQL schemas and database migrations under `supabase/migrations/`:

* **Schema File**: [`20260705040236_create_crime_analytics_schema.sql`](file:///d:/zoho/zoho/supabase/migrations/20260705040236_create_crime_analytics_schema.sql)
* To initialize your Supabase database, run the contents of the migration file inside your Supabase SQL Editor or apply it using the Supabase CLI:

```bash
supabase db push
```

---

## 📁 Project Directory Structure

```text
d:/zoho/zoho/
├── src/
│   ├── components/       # Reusable UI components (AppShell, FilterBar, Cards, Charts)
│   ├── pages/            # Application page views (Dashboard, Analytics, CrimeMap, Prediction, etc.)
│   ├── services/         # API clients, Supabase client, Auth context, Theme context & utilities
│   ├── App.tsx           # Main application routing and state layout
│   ├── main.tsx          # React application entry point
│   └── index.css         # Global Tailwind CSS and Leaflet style overrides
├── supabase/
│   ├── migrations/       # Database SQL schema definitions and migrations
│   └── functions/        # Supabase Edge Functions
├── public/               # Static assets
├── package.json          # Project scripts and dependency declarations
└── vite.config.ts        # Vite build and plugin configuration
```

---

## 🛡️ License & Verification

All builds, type checks, and linting rules have been verified for production readiness.
Happy Coding! 🚀
