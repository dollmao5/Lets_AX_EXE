const { execSync } = require('child_process');
const fs = require('fs');

console.log("=== Git 배포 상태 진단 시작 ===");
try {
  const status = execSync('git status', { encoding: 'utf8' });
  console.log("\n[1] git status 결과:");
  console.log(status);
} catch (e) {
  console.error("git status 실행 실패:", e.message);
}

try {
  const remote = execSync('git remote -v', { encoding: 'utf8' });
  console.log("\n[2] git remote 결과:");
  console.log(remote);
} catch (e) {
  console.error("git remote 실행 실패:", e.message);
}

try {
  const log = execSync('git log -n 3 --oneline', { encoding: 'utf8' });
  console.log("\n[3] 최근 커밋 로그:");
  console.log(log);
} catch (e) {
  console.error("git log 실행 실패:", e.message);
}
