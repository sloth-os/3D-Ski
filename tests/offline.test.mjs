import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

test(
  'a project-site install loads every course and saves a run with its host offline',
  { timeout: 60000 },
  async (t) => {
    const base = '/pages-check/'
    const host = await preview({
      configFile: false,
      base,
      logLevel: 'silent',
      preview: { host: '127.0.0.1', port: 0 },
    })
    t.after(async () => {
      if (host.httpServer.listening) await host.close()
    })
    const browser = await chromium.launch({
      executablePath: process.env.FALLLINE_CHROMIUM || undefined,
      args: ['--disable-webgl', '--disable-dev-shm-usage'],
    })
    t.after(() => browser.close())
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    })
    const page = await context.newPage(),
      errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('response', (response) => {
      if (response.status() >= 400)
        errors.push(response.status() + ' ' + response.url())
    })
    const address = host.httpServer.address()
    const url = 'http://127.0.0.1:' + address.port + base
    await page.goto(url)
    await page.evaluate(() =>
      navigator.serviceWorker.ready.then((reg) => reg.scope),
    )
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)
    const imageLoaded = async (file) => {
      await page.waitForFunction((name) => {
        const photo = document.querySelector('.course-poster')
        return (
          photo?.complete &&
          photo.naturalWidth > 0 &&
          photo.currentSrc.endsWith(name)
        )
      }, file)
    }
    await imageLoaded('alpine-ridge.webp')
    await host.close()
    await context.setOffline(true)
    const response = await page.reload()
    assert.ok(response.fromServiceWorker())
    for (const [id, file] of [
      ['bowl', 'glacier-bowl.webp'],
      ['meadow', 'pine-meadow.webp'],
    ]) {
      await page.getByRole('button', { name: 'Run setup', exact: true }).click()
      await page.locator('[data-course="' + id + '"]').click()
      if (id === 'meadow') {
        await page
          .getByRole('button', { name: 'Snowboard', exact: true })
          .click()
        await page.locator('#technique').selectOption('boardSkid')
        await page.getByRole('button', { name: 'Powder', exact: true }).click()
      }
      await page.getByRole('button', { name: 'Apply setup' }).click()
      await imageLoaded(file)
    }
    await page.waitForSelector(
      '.mountain-canvas canvas[data-renderer="canvas"]',
    )
    await page
      .getByRole('combobox', { name: 'Camera view' })
      .selectOption('edge')
    await page.getByRole('button', { name: 'Expand force analysis' }).click()
    await page.getByRole('button', { name: 'Contact', exact: true }).click()
    assert.match(await page.locator('.load-split').innerText(), /Binding load/i)
    await page.getByRole('button', { name: 'Collapse force analysis' }).click()
    await page.getByRole('button', { name: 'Start run' }).click()
    await page.waitForFunction(
      () =>
        Number.parseInt(document.querySelector('.readout-speed')?.textContent) >
        0,
    )
    assert.ok(
      await page.getByRole('button', { name: 'Steer left' }).isVisible(),
    )
    const left = page.getByRole('button', { name: 'Steer left' })
    const position = await left.boundingBox()
    await page.mouse.move(
      position.x + position.width / 2,
      position.y + position.height / 2,
    )
    await page.mouse.down()
    await page.waitForFunction(
      () =>
        Number.parseInt(
          document.querySelector('.secondary-reading b').textContent,
        ) > 12,
    )
    await page.mouse.up()
    await page.getByRole('button', { name: 'End run', exact: true }).click()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('fallline.runs') || '[]').length === 1,
    )
    await page.reload()
    await page.getByRole('link', { name: 'Run log', exact: true }).click()
    assert.match(await page.locator('.log-table').innerText(), /Pine Meadow/)
    assert.match(await page.locator('.log-table').innerText(), /Skidded turns/)
    assert.deepEqual(errors, [])
  },
)
