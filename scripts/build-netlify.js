const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

const files = [
  'index.html',
  'style.css',
  'script.js',
  'chat-de-video.png',
  'sinal-de-alerta.png'
];

const directories = [
  'data',
  'assets'
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of files) {
  const source = path.join(root, file);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, path.join(dist, file));
  }
}

for (const directory of directories) {
  const source = path.join(root, directory);
  if (fs.existsSync(source)) {
    fs.cpSync(source, path.join(dist, directory), { recursive: true });
  }
}

console.log('Netlify build complete: static files copied to dist');
