import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createApp } from './createApp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const distPath = path.join(__dirname, '../dist');

const app = createApp();

app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next(err);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MQTT Publisher is live on port ${PORT}`);
});
