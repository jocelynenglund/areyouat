const { execSync } = require('child_process');
const { writeFileSync } = require('fs');
const { join } = require('path');

const repoRoot = join(__dirname, '..');

const gitLog = execSync(
  'git log --oneline -80 --format="%H|%h|%s|%cs|%an"',
  { cwd: repoRoot, encoding: 'utf-8' }
);

const commits = gitLog
  .trim()
  .split('\n')
  .filter((line) => line.length > 0)
  .map((line) => {
    const [hash, shortHash, message, date, author] = line.split('|');
    return { hash, shortHash, message, date, author };
  })
  .filter((c) => {
    const msg = c.message.toLowerCase();
    if (msg.startsWith('merge')) return false;
    if (msg.startsWith('revert')) return false;
    if (msg.startsWith('chore:') && msg.includes('ci')) return false;
    if (msg.startsWith('docs:')) return false;
    if (msg.startsWith('ci:')) return false;
    if (msg.startsWith('test:')) return false;
    return true;
  })
  .map((c) => {
    const msg = c.message.toLowerCase();
    let type = 'update';
    if (msg.startsWith('feat')) type = 'feature';
    else if (msg.startsWith('fix')) type = 'fix';
    else if (msg.startsWith('refactor')) type = 'refactor';
    else if (msg.startsWith('style')) type = 'refactor';

    let displayMessage = c.message
      .replace(/^(feat|fix|chore|refactor|docs|style|test|ci)(\([^)]+\))?:\s*/i, '')
      .replace(/^(feature):\s*/i, '');
    displayMessage = displayMessage.charAt(0).toUpperCase() + displayMessage.slice(1);

    return { ...c, type, displayMessage };
  })
  .slice(0, 40);

const changelog = {
  generated: new Date().toISOString(),
  commits,
};

writeFileSync(join(repoRoot, 'changelog.json'), JSON.stringify(changelog, null, 2));

console.log(`Generated changelog with ${commits.length} entries`);
