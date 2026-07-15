const fs = require('fs');

const EXCLUDED_CLIP_KEYS = new Set([
  "ch00-clip02",
  "ch01-clip01",
  "ch01-clip02",
  "ch01-clip07",
  "ch03-clip02",
  "ch03-clip03",
  "ch03-clip04",
  "ch04-clip04",
  "ch04-clip05",
  "ch06-clip12",
  "ch06-clip13",
  "ch06-clip14"
]);

const report = JSON.parse(fs.readFileSync('content/axcamp/export-report.json', 'utf8'));
const overrides = JSON.parse(fs.readFileSync('content/axcamp/visible-catalog-overrides.json', 'utf8'));

// server.js의 buildCatalog 로직 모사
const catalog = [];

report.chapters.forEach(ch => {
  const chKey = ch.chapterId.toLowerCase();
  const overrideCh = overrides.chapters[chKey] || {};
  const chapterTitle = overrideCh.title || ch.title;
  const chapterTime = overrideCh.time !== undefined ? overrideCh.time : ch.time;
  
  const visibleClips = [];
  
  ch.clips.forEach(clip => {
    // raw clip key 파싱 예: folder가 'chapters/CH01/ch01-clip06' 이면 'ch01-clip06'
    const parts = clip.folder.split('/');
    const clipKey = parts[parts.length - 1];
    
    if (EXCLUDED_CLIP_KEYS.has(clipKey)) {
      return; // 숨김 필터링
    }
    
    visibleClips.push({
      originalKey: clipKey,
      route: clip.route,
      title: clip.title,
      type: clip.type,
      folder: clip.folder
    });
  });
  
  if (visibleClips.length > 0) {
    catalog.push({
      chapterId: ch.chapterId,
      chapterNum: ch.chapterNum,
      title: chapterTitle,
      time: chapterTime,
      clips: visibleClips
    });
  }
});

// 순차 인덱싱하여 visibleClipKey 바인딩 및 오버라이드 맵 덮어쓰기
let clipIndex = 1;
catalog.forEach(chapter => {
  console.log(`\n■ ${chapter.chapterNum}: ${chapter.title} (${chapter.time})`);
  chapter.clips.forEach(clip => {
    // server.js visible-rebind 로직
    const chNumStr = chapter.chapterNum.replace(/\s+/g, '').toLowerCase(); // e.g. 'ch01'
    const indexStr = String(clipIndex).padStart(2, '0');
    const visibleClipKey = `${chNumStr}-clip${indexStr}`;
    
    // 오버라이드 적용
    const overrideClip = overrides.clips[clip.originalKey] || {};
    const finalTitle = overrideClip.title || clip.title;
    const finalType = overrideClip.type || clip.type;
    
    console.log(`   - [clip ${indexStr}] [${finalType}] ${finalTitle} (내부 키: ${clip.originalKey} -> visible: ${visibleClipKey})`);
    clipIndex++;
  });
});
