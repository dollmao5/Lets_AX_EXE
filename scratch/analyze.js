const fs = require('fs');

function main() {
  const text = fs.readFileSync('scratch/downloaded.js', 'utf8');
  console.log('File size:', text.length);

  // Search function
  function search(keyword) {
    console.log(`=== Searching for: ${keyword} ===`);
    let idx = 0;
    let count = 0;
    while (true) {
      idx = text.toLowerCase().indexOf(keyword.toLowerCase(), idx);
      if (idx === -1) break;
      count++;
      const start = Math.max(0, idx - 150);
      const end = Math.min(text.length, idx + 150);
      console.log(`[Match #${count} at ${idx}]`);
      console.log(text.slice(start, end).replace(/\n/g, ' '));
      console.log('----------------------------------------------------');
      idx += keyword.length;
    }
  }

  search('password');
  search('host');
  search('login');
}

main();
