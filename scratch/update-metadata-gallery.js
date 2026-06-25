const fs = require('fs');
const path = require('path');

function main() {
  const htmlPath = path.join(__dirname, '../content/axcamp/chapters/CH02/ch02-clip02/content.html');
  const metaPath = path.join(__dirname, '../content/axcamp/chapters/CH02/ch02-clip02/metadata.json');

  console.log('Syncing html content to metadata.json');

  if (!fs.existsSync(htmlPath) || !fs.existsSync(metaPath)) {
    console.error('Files not found!');
    return;
  }

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const metaRaw = fs.readFileSync(metaPath, 'utf8');

  let meta;
  try {
    meta = JSON.parse(metaRaw);
  } catch (err) {
    console.error('Failed to parse metadata.json:', err);
    return;
  }

  meta.html = htmlContent;

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  console.log('metadata.json successfully synced with content.html!');
}

main();
