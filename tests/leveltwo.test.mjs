import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

test(
  'Level II coaching, motion adjustments, personal replay and credit survive a return to either sport',
  { timeout: 140000 },
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
      viewport: { width: 1080, height: 850 },
      reducedMotion: 'reduce',
    })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    const url = 'http://127.0.0.1:' + host.httpServer.address().port + '/'
    await page.goto(url + '#skiing/parallel')
    const lab = page.getByRole('dialog'),
      picker = lab.getByLabel('Training station')
    await lab.getByRole('button', { name: /PSIA Level II training/ }).click()
    assert.equal(await picker.locator('option').count(), 10)
    await picker.selectOption('wedge-christie')
    await lab.locator('.study-surface canvas[data-renderer="webgl"]').waitFor()
    await lab.getByRole('button', { name: 'Shaping', exact: true }).click()
    const opening = lab
      .getByRole('row')
      .filter({ hasText: 'Ski opening' })
      .getByRole('cell')
    assert.notEqual(
      await opening.nth(1).textContent(),
      await opening.nth(2).textContent(),
    )
    await lab.getByLabel('Apply coaching cue').selectOption('0')
    assert.equal(
      await opening.nth(1).textContent(),
      await opening.nth(2).textContent(),
    )
    await lab.getByLabel('Replay camera').selectOption('chase')
    await lab.locator('.study-surface canvas[data-renderer="webgl"]').waitFor()
    await lab.getByRole('button', { name: 'Play movement' }).click()
    await page.waitForFunction(
      () =>
        Number(document.querySelector('[aria-label="Replay position"]').value) >
        85,
    )
    await lab.getByRole('button', { name: 'Pause replay' }).click()
    await lab.getByRole('button', { name: 'Snowboarding', exact: true }).click()
    assert.equal(await picker.locator('option').count(), 12)
    await picker.selectOption('tail-press')
    assert.ok(page.url().endsWith('#snowboarding/level-ii/tail-press'))
    const movement = lab.getByRole('region', { name: 'Movement analysis' }),
      teaching = lab.getByRole('region', { name: 'Teach the next run' })
    await movement.getByRole('button').nth(0).click()
    await movement.locator('[data-result="retry"]').waitFor()
    await movement.getByRole('button').nth(1).click()
    await teaching.getByRole('button').nth(2).click()
    assert.equal(
      await lab.locator('.station-status [data-earned="true"]').count(),
      2,
    )
    await page.reload()
    assert.equal(
      await lab.locator('.station-status [data-earned="true"]').count(),
      2,
    )
    await lab.getByRole('button', { name: 'Play station', exact: true }).click()
    await page
      .getByRole('region', { name: 'Level II assignment' })
      .getByText('Tail-press preparation')
      .waitFor()
    await page.locator('main').focus()
    await page.keyboard.down('j')
    await lab
      .getByText('Station goal reached', { exact: true })
      .waitFor({ timeout: 35000 })
    await page.keyboard.up('j')
    assert.match(await lab.locator('.station-result').innerText(), /1.2 \/ 1.2/)
    await lab.getByRole('button', { name: 'Replay my station' }).click()
    assert.equal(
      await lab.locator('.station-status [data-earned="true"]').count(),
      3,
    )
    assert.equal(
      await lab
        .getByRole('button', { name: 'My recorded run' })
        .getAttribute('aria-pressed'),
      'true',
    )
    await lab.getByRole('button', { name: 'Last frame' }).click()
    assert.ok(Number(await lab.getByLabel('Replay position').inputValue()) > 90)
    await lab.getByRole('button', { name: 'Reference', exact: true }).click()
    await lab.getByRole('button', { name: 'Your attempt', exact: true }).click()
    await page.goto(url + '#run-log')
    await lab.getByRole('button', { name: /Tail-press preparation/ }).click()
    await lab.getByRole('button', { name: 'Ride again' }).click()
    await page
      .getByRole('region', { name: 'Level II assignment' })
      .getByText(/0.0 \/ 1.2/)
      .waitFor()
    await page.getByRole('button', { name: 'End run', exact: true }).click()
    await lab.getByText('Station review', { exact: true }).waitFor()
    await page.goto(url + '#skiing/level-ii')
    await picker.waitFor()
    assert.equal(await picker.inputValue(), 'gliding-wedge')
    await lab.getByRole('button', { name: 'All lessons' }).click()
    await lab.getByLabel('Lesson', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
  },
)
