const path = require('path');
const express = require('express');
const app = require('./app');

const PORT = process.env.PORT || 3001;

// Serve static files in local dev/production
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`StrengthCharts API running on http://0.0.0.0:${PORT}`);
});
