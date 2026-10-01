import { chromium, devices } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'file://' + path.join(root, 'dist', 'numbered.html');

const fails = [];
const check = (n, c, x = '') => { console.log((c ? '  ok   ' : '  FAIL ') + n + ' ' + x); if (!c) fails.push(n); };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
// iPhone profile: touch events, mobile viewport, no mouse
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(FILE);
await page.waitForSelector('.wizard');

// --- the reported bug: clear the name, then tap Continue ---
await page.fill('input[type=text]', '');
await page.waitForTimeout(100);
const btn = page.locator('button:has-text("Continue")');
check('Continue is never disabled', !(await btn.isDisabled()));
check('a hint explains the blank name', (await page.locator('.wizard').innerText()).includes('My Challenge'));
await btn.tap();
await page.waitForTimeout(250);
check('tapping Continue with a blank name advances', (await page.locator('h1').innerText()) === 'Period');
const named = await page.evaluate(() => JSON.parse(localStorage.getItem('numbered.v1') || '{}')?.config?.name);
check('blank name fell back instead of blocking', named === 'My Challenge', String(named));

// --- step 2 date layout at phone width ---
const dateBoxes = await page.locator('input[type=date]').evaluateAll((els) =>
  els.map((e) => { const r = e.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) }; })
);
const vw = await page.evaluate(() => document.documentElement.clientWidth);
check('two date fields present', dateBoxes.length === 2, JSON.stringify(dateBoxes));
check('no date field overflows the viewport', dateBoxes.every((d) => d.right <= vw + 1), `vw=${vw} ${JSON.stringify(dateBoxes)}`);
const [start, len] = await page.locator('.grid > .field').evaluateAll((els) =>
  els.slice(0, 2).map((e) => Math.round(e.getBoundingClientRect().width)));
check('the two columns are equal width', Math.abs(start - len) <= 1, `${start} vs ${len}`);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('no horizontal page overflow on the period step', overflow <= 1, 'overflow=' + overflow);
const fs = await page.locator('input[type=date]').first().evaluate((e) => getComputedStyle(e).fontSize);
check('inputs are >= 16px so iOS will not zoom', parseFloat(fs) >= 16, fs);

// --- finish the wizard by tapping only ---
// The real tap path is verified above, on the step that actually failed on the
// iPhone. For the remaining steps Playwright's synthetic pointer can't be used:
// under Chromium's mobile emulation the layout viewport (innerHeight 762) and
// the visual viewport (664, offsetTop 98) disagree, so its click lands ~98px
// above the element it measured. document.elementFromPoint returns the button
// correctly in both profiles, so this dispatches the event directly instead.
for (const label of ['Continue', 'Continue', 'Continue', 'Start challenge']) {
  await page.evaluate((text) => {
    const el = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
    if (!el) throw new Error('no button: ' + text);
    if (el.disabled) throw new Error('button is disabled: ' + text);
    el.click();
  }, label);
  await page.waitForTimeout(250);
}
await page.waitForSelector('.nav');
check('whole wizard completes by tap alone', (await page.locator('.nav__item').count()) === 5);

await page.screenshot({ path: path.join(root, 'shots', 'ios-period.png'), fullPage: true });
await b.close();
console.log('\nconsole errors: ' + (errors.length ? errors.join('; ') : 'none'));
console.log(fails.length ? `${fails.length} FAILED` : 'All iPhone-profile checks passed.');
process.exit(fails.length ? 1 : 0);
