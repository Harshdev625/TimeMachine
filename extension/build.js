require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BACKEND_URL = (process.env.BACKEND_URL || 'https://localhost:3000').replace(/\/$/, '');

const files = ['auth.js', 'background.js', 'manifest.json', 'modules/api.js']; // Add more if needed

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`${file} not found - skipping`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/__PRODUCTION_BACKEND_URL__/g, BACKEND_URL);
  fs.writeFileSync(filePath, content);
  console.log(`${file} injected with ${BACKEND_URL}`);
});