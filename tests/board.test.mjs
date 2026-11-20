import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

test(
  'snowboard grab replays, frontside spin controls and backwards ski practice share their on-course stance',
  { timeout: 180000 },
  async (t) => {
    const host = await preview({
      configFile: false,
      logLevel: 'silent',
      preview: { host: '127.0.0.1', port: 0 },
    })
    t.after(() => host.close())
    const browser = await chromium.launch({
      executablePath: process.env.FALLLINE_CHROMIUM || undefined,
      args: [
        '--enable-unsafe-swiftshader',
        '--use-angle=swiftshader',
        '--disable-dev-shm-usage',
      ],
    })
    t.after(() => browser.close())
    const page = await browser.newPage({
      viewport: { width: 1000, height: 720 },
      reducedMotion: 'reduce',
    })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    const url = 'http://127.0.0.1:' + host.httpServer.address().port + '/'
    const button = (name) => page.getByRole('button', { name, exact: true })
    await page.goto(url)
    await page.getByRole('link', { name: 'Snowboard tricks' }).click()
    const moves = page.getByRole('group', { name: 'Choose a snowboard trick' })
    assert.equal(await moves.getByRole('button').count(), 9)
    for (const [name, slug, grip] of [
      ['Indy grab', 'boardIndy', 'Right glove · toe edge'],
      ['Melon grab', 'boardMelon', 'Left glove · heel edge'],
      ['Nose grab', 'boardNoseGrab', 'Left glove · nose'],
    ]) {
      await moves.getByRole('button', { name, exact: true }).click()
      assert.equal(new URL(page.url()).hash, '#snowboard-tricks/' + slug)
      await page
        .locator('.study-surface canvas[data-renderer="webgl"]')
        .waitFor()
      await page.locator('.study-grip').filter({ hasText: grip }).waitFor()
      const load = page
        .locator('.trick-study .experiment-stats > div')
        .last()
        .locator('b')
      assert.equal(await load.textContent(), '0 N')
      await button('Landing').click()
      assert.ok(parseFloat(await load.textContent()) > 750)
    }
    await button('Frontside 180').click()
    await button('Practice this trick').click()
    await page.locator('.trick-hud[data-stance="forward"]').waitFor()
    assert.match(
      await page.locator('.trick-hud footer').innerText(),
      /spin left/i,
    )
    await page.getByRole('main').focus()
    await page.keyboard.down('j')
    await page.waitForFunction(
      () =>
        Number(
          document.querySelector('.jump-meter')?.getAttribute('aria-valuenow'),
        ) >= 99,
    )
    await page.keyboard.down('ArrowLeft')
    await page.keyboard.up('j')
    await page.locator('.trick-hud[data-phase="flight"]').waitFor()
    await page.keyboard.up('ArrowLeft')
    await page
      .locator('.trick-hud[data-stance="switch"] .hud-kicker')
      .filter({ hasText: 'Clean landing +190' })
      .waitFor()
    assert.match(
      await page.locator('.trick-hud footer').innerText(),
      /spin right/i,
    )
    await page.locator('.stance-chip[data-stance="switch"]:enabled').waitFor()
    await page.keyboard.press('v')
    await page.locator('.stance-chip[data-stance="forward"]:enabled').waitFor()
    await button('End run').click()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('fallline.runs') || '[]').length === 1,
    )
    const spinRun = await page.evaluate(
      () => JSON.parse(localStorage.getItem('fallline.runs'))[0],
    )
    assert.equal(spinRun.freestyle.landed, 1)
    assert.equal(spinRun.freestyle.points, 190)

    await page.goto(url + '#switch-riding/skiSwitch')
    const comparison = page.getByRole('group', {
      name: 'Compare riding stance',
    })
    const end = page.locator('.switch-study .study-grip')
    await end.filter({ hasText: 'Ski tails lead' }).waitFor()
    await page.locator('#switch-edge').fill('-32')
    await page
      .locator('.switch-readout')
      .filter({ hasText: 'Left ski' })
      .waitFor()
    await comparison.getByRole('button', { name: 'Forward' }).click()
    await end.filter({ hasText: 'Ski tips lead' }).waitFor()
    await page
      .locator('.switch-readout')
      .filter({ hasText: 'Right ski' })
      .waitFor()
    await button('Practice switch').click()
    await page
      .locator('.switch-hud[data-stance="switch"]')
      .filter({ hasText: 'Skiing backwards' })
      .waitFor()
    await page.waitForFunction(
      () =>
        parseInt(document.querySelector('.switch-hud footer')?.textContent) > 1,
    )
    await button('Pivot to forward').click()
    await page.locator('.switch-hud[data-stance="forward"]').waitFor()
    await button('End run').click()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('fallline.runs') || '[]').length === 2,
    )
    const skiRun = await page.evaluate(
      () => JSON.parse(localStorage.getItem('fallline.runs'))[0],
    )
    assert.equal(skiRun.setup.technique, 'skiSwitch')
    assert.ok(skiRun.switchRide.distance > 0)
    assert.deepEqual(errors, [])
  },
)
