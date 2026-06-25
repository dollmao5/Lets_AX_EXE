const fs = require('fs');

function main() {
  const text = fs.readFileSync('scratch/downloaded.js', 'utf8');

  // Let's search for Korean strings in the JS code
  const regex = /["']([^"']*[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+[^"']*)["']/g;
  let match;
  console.log('--- Korean Strings Found in Bundle ---');
  let count = 0;
  while ((match = regex.exec(text)) !== null) {
    count++;
    if (count < 200) {
      console.log(`${count}: ${match[1]}`);
    }
  }
}

main();
