import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'file://' + path.join(root, 'index.html');
const SHOTS = path.join(root, 'shots');
await fs.mkdir(SHOTS, { recursive: true });

const errors = [];
const fails = [];
const check = (name, cond, extra = '') => {
  if (cond) console.log(`  ok   ${name}`);
  else { console.log(`  FAIL ${name} ${extra}`); fails.push(name); }
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function newPage(w = 1280, h = 1400) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return { ctx, page };
}

console.log('\n1. First open — wizard, branded, generic defaults');
{
  const { ctx, page } = await newPage();
  await page.goto(FILE);
  await page.waitForSelector('.wizard');
  check('a new visitor gets the wizard, not someone else’s challenge', (await page.locator('.wizard').count()) === 1);
  check('wordmark on the wizard', (await page.locator('.brand__word').innerText()) === 'Numbered');
  check('verse on step one', (await page.locator('.verse').count()) === 1);
  const name = await page.inputValue('input[type=text]');
  check('generic default name', !/Q4 Self-Development/.test(name), name);

  await page.fill('input[type=text]', 'Q4 Self-Development challenge');
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('input[type=date]');
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('.swatch-picker');
  const cats = await page.locator('.listrow input[type=text]').evaluateAll((e) => e.map((x) => x.value));
  check('four default areas', cats.length === 4, JSON.stringify(cats));
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('input[placeholder="Habit name"]');
  check('six default habits', (await page.locator('input[placeholder="Habit name"]').count()) === 6);
  await page.click('button:has-text("Continue")');
  await page.click('button:has-text("Start challenge")');

  await page.waitForSelector('.nav');
  check('five tabs', (await page.locator('.nav__item').count()) === 5);
  check('Insights replaces Charts + Weekly', (await page.locator('.nav__item:has-text("Insights")').count()) === 1);
  await page.waitForTimeout(500); // the save is debounced
  const stored = await page.evaluate(() => Object.keys(localStorage));
  check('new storage key', stored.includes('numbered.v1'), stored.join(','));
  await page.screenshot({ path: path.join(SHOTS, '01-dashboard.png'), fullPage: true });
  await ctx.close();
}

async function setUp(page) {
  await page.goto(FILE);
  await page.waitForSelector('.wizard');
  await page.click('button:has-text("Skip setup")');
  await page.waitForSelector('.nav');
}

console.log('\n2. Quick log — three taps, then undo');
{
  const { ctx, page } = await newPage(430, 1500);
  await setUp(page);
  await page.click('.nav__item:has-text("Daily")');
  await page.waitForSelector('.ql');

  check('verse shows on an empty day', (await page.locator('.verse').count()) > 0);
  check('durations start disabled', await page.locator('.chip--dur').first().isDisabled());

  await page.click('.chip:has-text("Career")');
  await page.waitForTimeout(120);
  check('free-text field appears with no history', (await page.locator('input[type=text]').count()) === 1);
  await page.fill('input[type=text]', 'Deep work block');
  await page.waitForTimeout(120);
  check('durations enable once step 2 is done', !(await page.locator('.chip--dur').first().isDisabled()));
  await page.click('.chip--dur:has-text("45m")');
  await page.waitForTimeout(250);

  check('entry logged', (await page.locator('.entry').count()) === 1);
  check('day total updated', (await page.locator('.card:has-text("Logged today") .serif').first().innerText()).includes('45'));
  check('toast offers undo', (await page.locator('.toast button:has-text("Undo")').count()) === 1);
  await page.screenshot({ path: path.join(SHOTS, '02-daily-logged.png'), fullPage: true });

  await page.click('.toast button:has-text("Undo")');
  await page.waitForTimeout(250);
  check('undo removes the entry', (await page.locator('.entry').count()) === 0);

  // the area stays selected after a log, so you can log two things in a row
  check('area stays selected after logging',
    (await page.locator('.chip:has-text("Career")[aria-pressed="true"]').count()) === 1);

  // log again, then check the activity becomes a one-tap chip tomorrow
  await page.fill('input[type=text]', 'Deep work block');
  await page.click('.chip--dur:has-text("60m")');
  await page.waitForTimeout(250);
  await page.click('button[aria-label="Next day"]');
  await page.waitForTimeout(250);
  await page.click('.chip:has-text("Career")');
  await page.waitForTimeout(150);
  check('yesterday’s activity is now a one-tap chip',
    (await page.locator('.chip:has-text("Deep work block")').count()) === 1);

  // two taps: chip + duration
  await page.click('.chip:has-text("Deep work block")');
  await page.click('.chip--dur:has-text("30m")');
  await page.waitForTimeout(250);
  check('two-tap repeat logs', (await page.locator('.entry').count()) === 1);

  // repeat yesterday
  await page.click('button:has-text("Repeat yesterday")');
  await page.waitForTimeout(250);
  check('repeat yesterday adds the prior day', (await page.locator('.entry').count()) === 2);
  await ctx.close();
}

console.log('\n3. Habits, persistence, insights');
{
  const { ctx, page } = await newPage();
  await setUp(page);
  await page.click('.nav__item:has-text("Daily")');
  await page.waitForSelector('.htile');
  await page.locator('.htile').first().click();
  await page.waitForTimeout(150);
  check('habit tile toggles', (await page.locator('.htile[aria-pressed="true"]').count()) === 1);
  await page.reload();
  await page.waitForSelector('.nav');
  await page.click('.nav__item:has-text("Daily")');
  await page.waitForSelector('.htile');
  check('habit survives reload', (await page.locator('.htile[aria-pressed="true"]').count()) === 1);

  await page.click('.nav__item:has-text("Habits")');
  await page.waitForSelector('.habit-grid');
  check('habit grid + heatmaps', (await page.locator('.heat--cal').count()) === 6);

  await page.click('.nav__item:has-text("Insights")');
  await page.waitForSelector('.recharts-wrapper');
  // the challenge has not opened yet, so only the charts that can plot an empty
  // range render; the per-day and donut views correctly show their empty state
  check('cumulative + habit charts render inside Insights',
    (await page.locator('.recharts-wrapper').count()) >= 2);
  check('empty states shown for the rest', (await page.locator('.empty').count()) >= 1);
  await page.click('.chip:has-text("This week")');
  await page.waitForTimeout(350);
  check('weekly view reachable from Insights', (await page.locator('.card:has-text("Weekly review")').count()) === 1);
  await page.screenshot({ path: path.join(SHOTS, '03-insights.png'), fullPage: true });
  await ctx.close();
}

console.log('\n4. Export, import, theme');
{
  const { ctx, page } = await newPage();
  await setUp(page);
  await page.click('.nav__item:has-text("Daily")');
  await page.waitForSelector('.ql');
  await page.click('.chip:has-text("Spiritual")');
  await page.fill('input[type=text]', 'Quiet time');
  await page.click('.chip--dur:has-text("30m")');
  await page.waitForTimeout(250);

  await page.click('.nav__item:has-text("Settings")');
  await page.waitForSelector('button:has-text("Export backup")');
  const dl = page.waitForEvent('download');
  await page.click('button:has-text("Export backup (JSON)")');
  const jsonPath = path.join(root, 'test', 'roundtrip.json');
  await (await dl).saveAs(jsonPath);
  const parsed = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
  check('backup carries the entry', Object.values(parsed.entries).flat().length === 1);
  check('backup carries the config', parsed.config.categories.length === 4 && parsed.config.habits.length === 6);

  const dl2 = page.waitForEvent('download');
  await page.click('button:has-text("Daily log (CSV)")');
  let csv = '';
  for await (const c of await (await dl2).createReadStream()) csv += c;
  check('CSV header intact', csv.startsWith('Date,Day,Focus area,Activity,Minutes,Note'));

  await page.click('.iconbtn');
  await page.waitForTimeout(250);
  check('dark mode applies', (await page.getAttribute('html', 'data-theme')) === 'dark');
  await page.click('.nav__item:has-text("Dashboard")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, '04-dashboard-dark.png'), fullPage: true });
  await ctx.close();

  // import into a clean profile
  const { ctx: c2, page: p2 } = await newPage();
  await setUp(p2);
  await p2.click('.nav__item:has-text("Settings")');
  await p2.setInputFiles('input[type=file]', jsonPath);
  await p2.waitForSelector('.modal');
  const importWarned = /does not merge/i.test(await p2.locator('.modal').innerText());
  await p2.click('button:has-text("Replace my data")');
  await p2.waitForTimeout(400);
  await p2.click('.nav__item:has-text("Daily")');
  await p2.waitForTimeout(300);
  check('import round-trip restores the entry', (await p2.locator('.entry').count()) === 1);
  check('import warning says it replaces, not merges', importWarned);
  await c2.close();
}

console.log('\n5. Mobile & keyboard');
{
  const { ctx, page } = await newPage(390, 1200);
  await setUp(page);
  const ov = async () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('no horizontal overflow (dashboard)', (await ov()) <= 1, 'overflow=' + (await ov()));
  await page.click('.nav__item:has-text("Daily")');
  await page.waitForSelector('.ql');
  check('no horizontal overflow (daily)', (await ov()) <= 1, 'overflow=' + (await ov()));
  await page.screenshot({ path: path.join(SHOTS, '05-mobile-daily.png'), fullPage: true });
  const taps = await page.locator('.chip, .btn, .htile').evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().height).filter((h) => h > 0)
  );
  check('tap targets >= 36px', Math.min(...taps) >= 36, 'min=' + Math.min(...taps).toFixed(1));
  await page.reload(); // a fresh page, so the tab order starts at the top
  await page.waitForSelector('.nav');
  await page.keyboard.press('Tab');
  const f = await page.evaluate(() => document.activeElement.className);
  check('skip link is first tab stop', String(f).includes('skip-link'), f);
  await ctx.close();
}

await browser.close();
console.log('\nConsole errors: ' + (errors.length ? '\n  ' + errors.join('\n  ') : 'none'));
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(', ')}` : '\nAll checks passed.');
process.exit(fails.length || errors.length ? 1 : 0);
