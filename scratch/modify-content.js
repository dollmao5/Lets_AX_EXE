const fs = require('fs');
const path = require('path');

function main() {
  const filePath = path.join(__dirname, '../content/axcamp/chapters/CH02/ch02-clip02/content.html');
  console.log('Reading file:', filePath);

  if (!fs.existsSync(filePath)) {
    console.error('File not found!');
    return;
  }

  let text = fs.readFileSync(filePath, 'utf8');

  // 1. Replace details with gallery div
  const detailsStart = text.indexOf('<details class="tiro-guide-details">');
  const detailsEnd = text.indexOf('</details>', detailsStart);

  if (detailsStart !== -1 && detailsEnd !== -1) {
    const detailsBlock = text.slice(detailsStart, detailsEnd + '</details>'.length);
    console.log('Found details block. Replacing...');
    text = text.replace(detailsBlock, '<div class="slide-preview-gallery" data-slide-deck-preview="tiro-guide-deck" style="margin-top: 18px;"></div>');
  } else {
    console.warn('Details block not found!');
  }

  // 2. Remove tiro modal block and script
  const modalStart = text.indexOf('<div class="tiro-image-modal" id="ch02Clip02TiroImageModal"');
  // Find the closing onload script tag
  const scriptEndStr = '})(this);">';
  const modalEnd = text.indexOf(scriptEndStr, modalStart);

  if (modalStart !== -1 && modalEnd !== -1) {
    const modalBlock = text.slice(modalStart, modalEnd + scriptEndStr.length);
    console.log('Found modal block. Removing...');
    text = text.replace(modalBlock, '');
  } else {
    console.warn('Modal block not found!');
  }

  fs.writeFileSync(filePath, text, 'utf8');
  console.log('content.html updated successfully!');
}

main();
