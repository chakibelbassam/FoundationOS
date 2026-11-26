/** Run a version-owned Playwright journey against its normal launcher on Windows. */
const {spawn, spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { chromium } = require('playwright');

async function run(version) {
  if (!/^\d+\.\d+$/.test(version)) throw Error('Pass a version number, for example 0.1');
  const folder = path.resolve(__dirname, '../../versions', version + ' FoundationOS');
  const journey = require(path.join(folder, 'verify-browser.cjs'));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'foundationos-browser-'));
  const processHandle = spawn('cmd.exe', ['/d','/c','Start.cmd'], {
    cwd:folder, windowsHide:true, stdio:['ignore','pipe','inherit'],
    env:{...process.env, FOUNDATIONOS_DATA:data, FOUNDATIONOS_PORT:'0'}
  });
  let browser;
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('No local readiness URL within 20 seconds')), 20000);
      processHandle.once('error', error => { clearTimeout(timer); reject(error); });
      processHandle.once('exit', () => { clearTimeout(timer); reject(Error('Launcher exited')); });
      const lines = readline.createInterface({input:processHandle.stdout});
      lines.on('line', line => {
        const match = line.match(/http:\/\/127\.0\.0\.1:\d+\/\S*/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
    });
    browser = await chromium.launch({channel:'msedge',headless:true});
    const page = await browser.newPage();
    await journey(page, url);
  } finally {
    if (browser) await browser.close();
    if (processHandle.pid && processHandle.exitCode === null) {
      const stop = spawnSync('taskkill', ['/PID',String(processHandle.pid),'/T','/F'], {windowsHide:true});
      if (stop.status !== 0 && processHandle.exitCode === null) throw Error('Could not stop the QA launcher. Test data: '+data);
    }
    fs.rmSync(data, {recursive:true, force:true,maxRetries:4,retryDelay:150});
  }
}
run(process.argv[2] || '').catch(error => {console.error(error.message);process.exitCode=1;});
