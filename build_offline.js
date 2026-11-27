// build_offline.py와 같은 일을 Node로 한다 (파이썬이 없는 PC용).
// 실행: node build_offline.js  → moonlight-arcade.html, block-level-test.html 생성
const fs = require('fs');
const path = require('path');

const root = __dirname;
let source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

source = source.replace(/<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*>\n?/g, '');
let scripts = 0;
source = source.replace(/<script src="(js\/[^"?]+\.js)(?:\?[^"]*)?"><\/script>/g, (_, file) => {
  scripts++;
  return '<script>\n' + fs.readFileSync(path.join(root, file), 'utf8') + '</script>';
});
const mime = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.jpg': 'image/jpeg' };
let count = 0;
const result = source.replace(/"(assets\/(?:home|sprites|audio|blocks)\/[^"]+\.(?:png|jpg|mp3|wav))"/g, (_, file) => {
  count++;
  const data = fs.readFileSync(path.join(root, file)).toString('base64');
  return `"data:${mime[path.extname(file)] || 'image/png'};base64,${data}"`;
});
if (scripts < 3 || count < 8) throw new Error(`Missing game scripts or assets (${scripts} scripts, ${count} assets)`);

fs.writeFileSync(path.join(root, 'moonlight-arcade.html'), result, 'utf8');
const test = result
  .replace('<html lang="ko">', '<html lang="ko" data-block-test>')
  .replace('<title>달빛 오락실</title>\n<meta name="theme-color" content="#15102b">', '<title>별빛 블록 단계 테스트</title>');
if (!test.includes('data-block-test') || !test.includes('단계 테스트</title>')) throw new Error('block test marker not added');
fs.writeFileSync(path.join(root, 'block-level-test.html'), test, 'utf8');
console.log(`ok: ${scripts} scripts, ${count} assets`);
