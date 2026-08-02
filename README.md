# Corporate Gifts Catalog

Product catalog for Malaysian corporate gifts agency with CSV import/export.

## Features

- ✅ Search & filter products
- ✅ Add/edit/delete products (admin only)
- ✅ Import/export CSV
- ✅ Drag & drop images
- ✅ Mobile responsive
- ✅ No backend needed

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Deploy

Deployed on Netlify. Just push to GitHub and Netlify auto-deploys!

## Admin Password

Default: `admin123`

Change in `src/CatalogWithCSVImport.jsx` line with `const ADMIN_PASSWORD`

## CSV Format

```
id,name,category,price,leadTime,leadLabel,moq,image,branding
1,"Product Name","Category",35,"L2","5-7 days",50,"","Laser"
```
