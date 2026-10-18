# VIN Scanner Tracker

A mobile-first web app for a vehicle detailing crew: workers log each car by scanning its VIN, managers watch jobs arrive in real time and export billing.

## Features
- **VIN scanner**: reads the VIN from a barcode, a QR code or plain text (OCR), with on-screen diagnostics when a scan fails
- **Worker app**: log vehicles, services and add-ons per dealer, with prices
- **Manager panel**: live job feed through Supabase realtime, filters by dealer and date range
- **Export**: CSV for spreadsheets and a print-ready invoice view

## Stack
React + Vite, Supabase (Postgres + realtime), deployed on Vercel.

## Run it locally
```bash
npm install
cp .env.example .env   # add your Supabase URL and anon key
npm run dev
```

## Background
This is a **white-label version of a product in production use by clients**. I built it for a mobile detailing business that services car dealerships. This public copy uses demo branding and a placeholder address.
