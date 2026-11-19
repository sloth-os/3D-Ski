import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

test(
  'the native 3D cameras, snowboard study, force inspector, and frame stepping work together',
  { timeout: 120000 },
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
      viewport: { width: 1050, height: 700 },
      reducedMotion: 'reduce',
    })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto('http://127.0.0.1:' + host.httpServer.address().port + '/')
    const world = page.locator('.mountain-canvas canvas[data-renderer="webgl"]')
    await world.waitFor()
    const camera = page.getByRole('combobox', { name: 'Camera view' })
    const images = new Set()
    for (const view of ['chase', 'first', 'side', 'edge', 'aerial']) {
      await camera.selectOption(view)
      await page.waitForFunction(
        (v) =>
          document.querySelector('.mountain-canvas').dataset.plate ===
          (v === 'chase' ? 'on' : 'off'),
        view,
      )
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      )
      images.add((await world.screenshot()).toString('base64'))
    }
    assert.equal(images.size, 5)
    await page.getByRole('link', { name: 'Technique lab' }).click()
    await page
      .getByRole('button', { name: 'Edge-to-edge carve', exact: true })
      .click()
    await page.locator('.study-surface canvas[data-renderer="webgl"]').waitFor()
    await page.locator('#edge-range').fill('52')
    await page.locator('#speed-range').fill('40')
    await page.getByLabel('3D study layer').selectOption('contact')
    await page.getByRole('button', { name: 'Link turns' }).click()
    await page.getByRole('button', { name: 'Hold pose' }).click()
    assert.match(
      await page.locator('.experiment .experiment-stats').innerText(),
      /Front binding/i,
    )
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Watch demo' })
      .click()
    await page
      .locator('.mode-label')
      .filter({ hasText: 'Technique demo' })
      .waitFor()
    await page
      .getByRole('combobox', { name: 'Playback speed' })
      .selectOption('0.25')
    await page.getByRole('button', { name: 'Pause demo' }).click()
    const clock = page.locator('.paused-chip span')
    const before = parseFloat(await clock.textContent())
    await page.getByRole('button', { name: 'Step one frame' }).click()
    const increment = parseFloat(await clock.textContent()) - before
    assert.ok(increment >= 0.009 && increment <= 0.021)
    await page.getByRole('button', { name: 'Body', exact: true }).click()
    await page.locator('.force-rows button').first().click()
    assert.match(await page.getByRole('dialog').innerText(), /Front knee/i)
    assert.equal(await page.locator('.frame-inspector tbody tr').count(), 4)
    await page.getByRole('button', { name: 'Close dialog' }).click()
    await page.getByRole('button', { name: 'Stop demo' }).click()
    await page
      .locator('.mode-label')
      .filter({ hasText: 'Free practice' })
      .waitFor()
    assert.deepEqual(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('fallline.runs') || '[]'),
      ),
      [],
    )
    assert.deepEqual(errors, [])
  },
)
