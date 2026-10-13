# Solar Company Website (full project)

Static front end + small Node/Express backend that receives and stores contact-form enquiries.

## Structure
```
solar-site/
├── server.js            Express server: serves the site + POST /api/enquiry + GET /api/leads
├── package.json
├── .env.example         Copy to .env and fill in
├── data/leads.json      Created automatically when the first enquiry arrives
└── public/
    ├── index.html       Page markup + SEO metadata
    ├── css/styles.css   All styling (colour tokens at the top)
    ├── js/config.js     EDIT THIS: company name, phone, WhatsApp, calculator assumptions,
    │                    services, FAQs, gallery images, testimonials
    ├── js/main.js       Rendering, calculator, gallery, form logic
    └── robots.txt
```

## Run
Requires Node 18+.
```
npm install
cp .env.example .env     # set ADMIN_TOKEN (and SMTP_* if you want email alerts)
npm start                # http://localhost:3000
```
VS Code: open the folder, open a terminal, run the commands above. `npm run dev` auto-restarts on changes.

## Using it
- Enquiries are saved to `data/leads.json`.
- View them: `curl -H "x-admin-token: YOUR_TOKEN" http://localhost:3000/api/leads`
- Email alerts: fill the SMTP_* and NOTIFY_EMAIL values in `.env`.
- Add photos: put images in `public/images/` and reference them in `js/config.js` -> gallery.
- Add testimonials (real ones only) in `js/config.js` -> testimonials.

## Before going live
- Replace every [PLACEHOLDER] in `js/config.js` and in `public/index.html` (title, meta tags).
- Verify calculator assumptions and remove any you can't stand behind.
- Update footer social links.
- Deploy on any Node host (Render, Railway, a VPS). Use HTTPS. For heavy use, replace the JSON
  file with a database (the `saveLead` function in server.js is the only place to change).
