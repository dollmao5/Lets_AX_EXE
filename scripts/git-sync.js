const { execSync } = require('child_process');

try {
  const targetDir = `d:\\26년\\20.실팀장 리더십 향상 과정개발\\03.Github_AX Camp_260519\\Lets_AX_EXE`;
  console.log('Target Directory:', targetDir);
  
  // 1. git add .
  console.log('Running git add . ...');
  const addOut = execSync('git add .', { cwd: targetDir, encoding: 'utf8' });
  console.log(addOut || 'git add success');

  // 2. git commit
  console.log('Running git commit ...');
  const commitOut = execSync('git commit -m "feat: move ch04-clip03 to ch03 and rename to 참고_ChatGPT 및 GPTs 소개"', { cwd: targetDir, encoding: 'utf8' });
  console.log(commitOut);

  // 3. git push
  console.log('Running git push ...');
  const pushOut = execSync('git push origin main', { cwd: targetDir, encoding: 'utf8' });
  console.log(pushOut);

} catch (error) {
  console.error('Error occurred:', error.message);
  if (error.stdout) console.log('STDOUT:', error.stdout);
  if (error.stderr) console.error('STDERR:', error.stderr);
}
