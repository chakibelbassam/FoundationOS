const assert = require('node:assert/strict');
module.exports = async function verifyStatus(page, url) {
  const response = await page.goto(url);
  assert.equal(response.status(), 200);
  const text = await page.locator('body').innerText();
  assert.match(text, /"version"\s*:\s*"0\.1"/);
  assert.match(text, /"status"\s*:\s*"ready"/);
  await page.reload();
  assert.match(await page.locator('body').innerText(), /"ready"/);
  console.log('PASS: browser opened and refreshed the 0.1 server status through Start.cmd.');
};
