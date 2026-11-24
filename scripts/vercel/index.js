const express = require('express');
const path = require('node:path');

// Vercel detects an Express entry at the artifact root. Keep API paths intact for the app.
const app = express();
app.disable('x-powered-by');
app.use(require('./dist/index.js').default);

// Vercel serves public assets separately. Send only the SPA shell on browser entry paths.
app.get(['/', '/login', '/register', '/invite', '/projects', '/projects/*', '/showcase', '/showcase/*'], (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

module.exports = app;
