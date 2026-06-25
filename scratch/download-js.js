process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');

async function main() {
  const url = 'https://share-board-sidk.onrender.com/assets/index-K205c-F1.js';
  console.log('Downloading ' + url);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const text = await res.text();
    fs.writeFileSync('scratch/downloaded.js', text);
    console.log('Downloaded successfully. Size:', text.length);

    // Let's search for keywords
    const keywords = ['password', 'host', 'login', 'admin'];
    for (const keyword of keywords) {
      let idx = 0;
      while (true) {
        idx = text.toLowerCase().indexOf(keyword, idx);
        if (idx === -1) break;
        const start = Math.max(0, idx - 100);
        const end = Math.min(text.length, idx + 100);
        console.log(`Keyword: ${keyword} at ${idx}`);
        console.log('CONTEXT:', text.slice(start, end).replace(/\n/g, ' '));
        console.log('----------------------------------------------------');
        idx += keyword.length;
      }
    }

    // Let's search for strict equality patterns that might be passwords
    // e.g. "==="
    const regex = /===[\s]*['"`]([^'"`]{2,30})['"`]/g;
    let match;
    console.log('Searching for === "value" patterns:');
    while ((match = regex.exec(text)) !== null) {
      console.log('Match:', match[0], 'Value:', match[1]);
    }

  } catch (err) {
    console.error(err);
  }
}

main();
