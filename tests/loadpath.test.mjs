import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

test(
  'load path connects the 3D landmarks, posture experiment, cockpit and frozen frame',
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
        viewport: { width: 1100, height: 830 },
        reducedMotion: 'reduce',
      }),
      errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    const url = 'http://127.0.0.1:' + host.httpServer.address().port + '/'
    await page.goto(url + '#skiing/carve/load-path')
    const lab = page.getByRole('dialog'),
      select = lab.getByLabel('Load path segment'),
      pin = lab.locator('.muscle-pin'),
      surface = lab.locator('.study-surface')
    await surface.locator('canvas[data-renderer="webgl"]').waitFor()
    assert.equal(await lab.getByLabel('3D study layer').inputValue(), 'path')
    assert.equal(await select.locator('option').count(), 7)
    await select.selectOption('knee')
    await lab.getByLabel('Load path foot').selectOption('right')
    await lab
      .locator('.chain-readout[data-part="knee"][data-side="1"]')
      .waitFor()
    await surface.scrollIntoViewIfNeeded()
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    )
    const at = await pin.evaluate((el) => ({
      x: parseFloat(el.style.left) / 100,
      y: parseFloat(el.style.top) / 100,
    }))
    await select.selectOption('upper')
    await pin.filter({ hasText: 'Upper body' }).waitFor()
    await surface.scrollIntoViewIfNeeded()
    const box = await surface.boundingBox()
    await page.mouse.click(box.x + box.width * at.x, box.y + box.height * at.y)
    await lab
      .locator('.chain-readout[data-part="knee"][data-side="1"]')
      .waitFor()
    assert.equal(await lab.getByLabel('Load path foot').inputValue(), 'right')
    await select.selectOption('upper')
    await lab.locator('.chain-readout[data-part="upper"]').waitFor()
    const values = lab.locator('.chain-readout dd'),
      base = await values.allTextContents()
    await lab.getByLabel('Torso tuck').fill('85')
    await page.waitForFunction(
      (old) =>
        document.querySelectorAll('.chain-readout dd')[1]?.textContent !== old,
      base[1],
    )
    assert.equal(await values.first().textContent(), base[0])
    await lab.getByRole('button', { name: 'Resolve force components' }).click()
    await lab
      .locator('.chain-components')
      .getByText('Along trunk', { exact: false })
      .waitFor()
    await select.selectOption('hip')
    await lab.getByLabel('Load path foot').selectOption('right')
    await lab.getByRole('button', { name: 'Practice this technique' }).click()
    const panel = page.locator('.force-console')
    await panel
      .locator('.chain-readout[data-part="hip"][data-side="1"]')
      .waitFor()
    await panel
      .locator('.chain-components')
      .getByText('Along thigh', { exact: false })
      .waitFor()
    await panel.getByRole('button', { name: 'Inspect this frame' }).click()
    const inspector = page.locator('.frame-inspector')
    assert.equal(
      await inspector.locator('table').first().locator('caption').textContent(),
      'Resolved equipment branches',
    )
    assert.match(await inspector.innerText(), /Shear along sole/)
    assert.match(await inspector.innerText(), /Upper-body weight moment/)
    await page.getByRole('button', { name: 'Close dialog' }).click()
    await panel.getByRole('button', { name: 'External vectors' }).click()
    assert.ok(
      await panel.getByText('Snow reaction', { exact: true }).isVisible(),
    )
    await panel.getByRole('button', { name: 'Load path', exact: true }).click()
    assert.equal(
      await panel.getByLabel('Load path segment').inputValue(),
      'hip',
    )
    assert.deepEqual(errors, [])
  },
)
