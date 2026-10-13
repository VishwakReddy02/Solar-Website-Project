require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const LEADS = path.join(__dirname, 'data', 'leads.json');

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  next();
});
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many requests.' } });

let mailer = null;
if (process.env.SMTP_HOST) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// serialise file writes so concurrent enquiries don't clobber each other
let queue = Promise.resolve();
const saveLead = (lead) => (queue = queue.then(async () => {
  let all = [];
  try { all = JSON.parse(await fs.readFile(LEADS, 'utf8')); } catch {}
  all.push(lead);
  await fs.writeFile(LEADS, JSON.stringify(all, null, 2));
}));

app.post('/api/enquiry', limiter, async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot: silently drop bots
  const lead = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    receivedAt: new Date().toISOString(),
    name: clean(b.name, 100), phone: clean(b.phone, 20), email: clean(b.email, 120),
    propertyType: clean(b.propertyType, 40), location: clean(b.location, 120),
    monthlyBill: clean(b.monthlyBill, 12), interest: clean(b.interest, 60), message: clean(b.message, 1500),
  };
  if (lead.name.length < 2) return res.status(400).json({ error: 'Please enter your name.' });
  if (!/^(\+?91[\s-]?)?[6-9]\d{9}$/.test(lead.phone.replace(/\s/g, ''))) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
  if (lead.email && !/^\S+@\S+\.\S+$/.test(lead.email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  try {
    await saveLead(lead);
  } catch (e) {
    console.error('Save failed:', e);
    return res.status(500).json({ error: 'Could not save your enquiry.' });
  }
  if (mailer && process.env.NOTIFY_EMAIL) {
    mailer.sendMail({
      from: process.env.SMTP_USER, to: process.env.NOTIFY_EMAIL,
      subject: `New solar enquiry: ${lead.name}`,
      text: Object.entries(lead).map(([k, v]) => `${k}: ${v}`).join('\n'),
    }).catch((e) => console.error('Email failed:', e.message));
  }
  res.json({ ok: true });
});

// view saved enquiries: curl -H "x-admin-token: YOUR_TOKEN" http://localhost:3000/api/leads
app.get('/api/leads', async (req, res) => {
  if (!process.env.ADMIN_TOKEN || req.get('x-admin-token') !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  try { res.json(JSON.parse(await fs.readFile(LEADS, 'utf8'))); } catch { res.json([]); }
});

app.get('/healthz', (_, res) => res.send('ok'));
app.listen(PORT, () => console.log(`Site running at http://localhost:${PORT}`));
