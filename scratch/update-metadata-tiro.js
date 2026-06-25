const fs = require('fs');
const path = require('path');

function main() {
  const filePath = path.join(__dirname, '../content/axcamp/chapters/CH02/ch02-clip02/metadata.json');
  console.log('Reading file:', filePath);

  if (!fs.existsSync(filePath)) {
    console.error('File not found!');
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (err) {
    console.error('Failed to parse JSON:', err);
    return;
  }

  if (typeof data.html !== 'string') {
    console.error('data.html is not a string!');
    return;
  }

  const targetText = '스마트폰 앱스토어에서 Tiro를 검색한 뒤 앱을 다운로드합니다. 설치가 완료되면 앱을 실행합니다.';
  const replacementText = '스마트폰 앱스토어에서 Tiro를 검색하거나 <a href="https://tiro.ooo/ko/download/app" target="_blank" rel="noopener noreferrer">Tiro 설치 페이지</a>를 통해 앱을 다운로드합니다. 설치가 완료되면 앱을 실행합니다.';

  if (!data.html.includes(targetText)) {
    console.warn('Target text not found in data.html!');
    // Let's do a loose check
    console.log('Loose match index:', data.html.indexOf('스마트폰 앱스토어에서 Tiro'));
  } else {
    console.log('Target text found. Replacing...');
    data.html = data.html.replace(new RegExp(targetText, 'g'), replacementText);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('metadata.json updated successfully!');
  }
}

main();
