const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '../content/axcamp/chapters/CH02/ch02-clip02');
const htmlFile = path.join(targetDir, 'content.html');
const jsonFile = path.join(targetDir, 'metadata.json');

try {
  if (!fs.existsSync(htmlFile)) {
    throw new Error(`HTML file not found at ${htmlFile}`);
  }
  if (!fs.existsSync(jsonFile)) {
    throw new Error(`JSON file not found at ${jsonFile}`);
  }

  const htmlContent = fs.readFileSync(htmlFile, 'utf8');
  const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

  jsonData.html = htmlContent;

  fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2), 'utf8');
  console.log('Successfully synced content.html to metadata.json html field!');
} catch (error) {
  console.error('Error syncing metadata:', error);
  process.exit(1);
}
