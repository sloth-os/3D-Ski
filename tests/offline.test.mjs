import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

test(
  'a project-site install loads the courses and freestyle replays and saves touch-controlled runs with its host offline',
  { timeout: 140000 },
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
    await page.goto(url + '#ski-tricks/safetyGrab')
    const lab = page.getByRole('dialog')
    await lab
      .locator('.muscle-readout[data-movement="Reaching for the grab"]')
      .waitFor()
    await lab.getByLabel('Muscle focus').selectOption('hamstrings')
    await lab.locator('.muscle-pin').filter({ hasText: 'Hamstrings' }).waitFor()
    await lab.getByRole('button', { name: 'Landing', exact: true }).tap()
    await lab
      .locator('.muscle-readout[data-movement="Landing absorption"]')
      .waitFor()
    await lab.getByRole('button', { name: 'Maneuver', exact: true }).tap()
    const offlineReplay = await page.reload()
    assert.ok(offlineReplay.fromServiceWorker())
    await page
      .locator('.study-surface canvas[data-renderer="canvas"]')
      .waitFor()
    await page
      .locator('.study-grip')
      .filter({ hasText: 'Right glove · right ski' })
      .waitFor()
    const practice = page.getByRole('button', { name: 'Practice this trick' })
    const launchButton = await practice.boundingBox()
    assert.ok(
      launchButton &&
        launchButton.y >= 0 &&
        launchButton.y + launchButton.height <= page.viewportSize().height,
    )
    await practice.click()
    await page
      .getByRole('combobox', { name: 'Playback speed' })
      .selectOption('0.5')
    const touch = await context.newCDPSession(page)
    async function pressControl(name) {
      const box = await page
        .getByRole('button', { name, exact: true })
        .boundingBox()
      assert.ok(box)
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
      })
    }
    const release = () =>
      touch.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      })
    const meter = (value) =>
      page.waitForFunction(
        (min) =>
          +document
            .querySelector('.jump-meter')
            .getAttribute('aria-valuenow') >= min,
        value,
      )
    await pressControl('Hold to load, release to jump')
    await meter(100)
    await release()
    await page.locator('.trick-hud[data-phase="flight"]').waitFor()
    await pressControl('Hold the trick pose')
    await meter(55)
    await release()
    await page
      .locator('.hud-kicker')
      .filter({ hasText: /Clean landing \+180/i })
      .waitFor()
    await page.getByRole('button', { name: 'End run', exact: true }).click()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('fallline.runs') || '[]').length === 2,
    )
    await page.reload()
    await page.getByRole('link', { name: 'Run log', exact: true }).click()
    assert.match(await page.locator('.log-table').innerText(), /Safety grab/)
    assert.match(await page.locator('.log-table').innerText(), /Skidded turns/)
    const mostRecent = await page.evaluate(
      () => JSON.parse(localStorage.getItem('fallline.runs'))[0],
    )
    assert.equal(mostRecent.freestyle.points, 180)
    await page.getByRole('button', { name: 'Close dialog' }).tap()
    await page.getByRole('button', { name: 'Run setup', exact: true }).tap()
    await page.getByRole('button', { name: 'Snowboard', exact: true }).tap()
    await page.locator('#technique').selectOption('boardIndy')
    await page
      .getByRole('group', { name: 'Starting stance' })
      .getByRole('button', { name: 'Switch · right foot leads' })
      .tap()
    await page.getByRole('button', { name: 'Apply setup' }).tap()
    await page.goto(url + '#snowboard-tricks/boardIndy')
    assert.ok((await page.reload()).fromServiceWorker())
    await page
      .locator('.study-surface canvas[data-renderer="canvas"]')
      .waitFor()
    await page
      .locator('.study-grip')
      .filter({ hasText: 'Left glove · toe edge' })
      .waitFor()
    await practice.tap()
    await page.locator('.trick-hud[data-stance="switch"]').waitFor()
    await page
      .getByRole('combobox', { name: 'Playback speed' })
      .selectOption('0.5')
    await pressControl('Hold to load, release to jump')
    await meter(100)
    await release()
    await page.locator('.trick-hud[data-phase="flight"]').waitFor()
    await pressControl('Hold the trick pose')
    await meter(55)
    await release()
    await page
      .locator('.trick-hud .hud-kicker')
      .filter({ hasText: 'Clean landing +180' })
      .waitFor()
    await page.getByRole('button', { name: 'End run', exact: true }).tap()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('fallline.runs') || '[]').length === 3,
    )
    await page.goto(url + '#switch-riding/boardSwitch')
    assert.ok((await page.reload()).fromServiceWorker())
    await page
      .locator('.switch-study .study-grip')
      .filter({ hasText: 'Tail · right foot leads' })
      .waitFor()
    await page
      .locator('.switch-readout')
      .filter({ hasText: 'Heel edge' })
      .waitFor()
    await page
      .getByRole('group', { name: 'Compare riding stance' })
      .getByRole('button', { name: 'Regular' })
      .tap()
    await page
      .locator('.switch-readout')
      .filter({ hasText: 'Toe edge' })
      .waitFor()
    await page.getByRole('button', { name: 'Practice switch' }).tap()
    await page.locator('.switch-hud[data-stance="switch"]').waitFor()
    await page.waitForFunction(
      () =>
        parseInt(document.querySelector('.switch-hud footer')?.textContent) > 1,
    )
    await page.getByRole('button', { name: 'Pivot to forward' }).tap()
    await page.locator('.switch-hud[data-stance="forward"]').waitFor()
    await page.getByRole('button', { name: 'End run', exact: true }).tap()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('fallline.runs') || '[]').length === 4,
    )
    await page.reload()
    await page.getByRole('link', { name: 'Run log', exact: true }).tap()
    const history = await page.locator('.log-table').innerText()
    assert.match(history, /Switch snowboarding/)
    assert.match(history, /Indy grab/)
    const [switchRun, indy] = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('fallline.runs')),
    )
    assert.ok(switchRun.switchRide.distance > 0)
    assert.equal(indy.setup.stance, 'switch')
    assert.equal(indy.freestyle.points, 180)
    await page.goto(url + '#skiing/skiStop')
    assert.ok((await page.reload()).fromServiceWorker())
    await page.locator('.safety-study canvas[data-renderer="canvas"]').waitFor()
    await page.getByRole('button', { name: 'Practice stopping' }).tap()
    await pressControl('Brake')
    await page.locator('.safety-hud[data-phase="rest"]').waitFor()
    await release()
    await page.getByRole('button', { name: /Check uphill/ }).tap()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('fallline.runs') || '[]').length === 5,
    )
    await page.goto(url + '#snowboarding/boardFall')
    assert.ok((await page.reload()).fromServiceWorker())
    await page.getByRole('button', { name: 'Practice fall response' }).tap()
    await pressControl('Flex legs')
    await page.locator('.safety-hud[data-phase="rest"]').waitFor()
    await release()
    await page.getByRole('button', { name: /Check uphill/ }).tap()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('fallline.runs') || '[]').length === 6,
    )
    await page.reload()
    await page.getByRole('link', { name: 'Run log' }).tap()
    assert.match(
      await page.locator('.log-table').innerText(),
      /Falling on a snowboard/,
    )
    const [fall, brake] = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('fallline.runs')),
    )
    assert.ok(
      fall.finished &&
        fall.safety.guarded &&
        brake.finished &&
        brake.safety.distance > 0,
    )
    assert.deepEqual(errors, [])
  },
)
