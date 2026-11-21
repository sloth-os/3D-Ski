import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

test(
  'the native cameras, snowboard study, freestyle replay, keyboard landing, and frame inspector work together',
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
    await page.getByRole('link', { name: 'Snowboarding', exact: true }).click()
    await page.getByLabel('Lesson', { exact: true }).selectOption('boardCarve')
    await page.locator('.study-surface canvas[data-renderer="webgl"]').waitFor()
    const lab = page.getByRole('dialog')
    await lab
      .locator('.muscle-readout[data-movement="Toe-edge support"]')
      .waitFor()
    await lab.getByLabel('Muscle focus').selectOption('calves')
    await lab.locator('.muscle-pin').filter({ hasText: 'Calves' }).waitFor()
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
    await page.getByRole('button', { name: 'Muscles', exact: true }).click()
    await page.locator('.force-console .muscle-readout').waitFor()
    assert.equal(
      await page
        .locator('.force-console')
        .getByLabel('Muscle focus')
        .inputValue(),
      'calves',
    )
    await page.getByRole('button', { name: 'Body', exact: true }).click()
    await page.locator('.force-rows button').first().click()
    assert.match(await page.getByRole('dialog').innerText(), /Front knee/i)
    assert.equal(
      await page
        .locator('.frame-inspector table')
        .first()
        .locator('tbody tr')
        .count(),
      4,
    )
    assert.equal(await page.locator('.muscle-table tbody tr').count(), 11)
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
    await page.getByRole('link', { name: 'Skiing', exact: true }).click()
    await page.getByLabel('Lesson', { exact: true }).selectOption('muteGrab')
    assert.equal(new URL(page.url()).hash, '#skiing/muteGrab')
    await page.locator('.study-surface canvas[data-renderer="webgl"]').waitFor()
    await page
      .locator('.study-grip')
      .filter({ hasText: 'Left glove · right ski' })
      .waitFor()
    const normalLoad = page
      .locator('.trick-study .experiment-stats > div')
      .last()
      .locator('b')
    assert.equal(await normalLoad.textContent(), '0 N')
    await lab
      .locator('.muscle-readout[data-movement="Reaching for the grab"]')
      .waitFor()
    await lab.getByRole('button', { name: 'Preload', exact: true }).click()
    await lab.locator('.muscle-readout[data-movement="Preload"]').waitFor()
    await lab.getByRole('button', { name: 'Takeoff', exact: true }).click()
    await lab.locator('.muscle-readout[data-movement="Push-off"]').waitFor()
    await page.getByRole('button', { name: 'Landing', exact: true }).click()
    assert.ok(parseFloat(await normalLoad.textContent()) > 750)
    await page.getByRole('button', { name: 'Rewind to approach' }).click()
    await page.getByRole('button', { name: 'Play trick', exact: true }).click()
    const slider = page.getByLabel('Replay position')
    await page.waitForFunction(
      () => +document.querySelector('.replay-slider input').value > 6,
    )
    await page.getByRole('button', { name: 'Pause replay' }).click()
    const paused = +(await slider.inputValue())
    await page.getByRole('button', { name: 'Play trick', exact: true }).click()
    await page.waitForFunction(
      (value) => +document.querySelector('.replay-slider input').value > value,
      paused,
    )
    await slider.fill('15')
    assert.equal(await page.locator('.replay-phase').textContent(), 'Takeoff')
    await page.getByLabel('Lesson', { exact: true }).selectOption('spin180')
    await page.getByRole('button', { name: 'Practice this trick' }).click()
    await page
      .getByRole('combobox', { name: 'Playback speed' })
      .selectOption('1')
    await page.getByRole('main').focus()
    const charged = () =>
      page.waitForFunction(
        () =>
          +document
            .querySelector('.jump-meter')
            .getAttribute('aria-valuenow') >= 99,
      )
    await page.keyboard.down('j')
    await charged()
    await page.keyboard.press('p')
    assert.equal(
      await page.locator('.trick-hud').getAttribute('data-phase'),
      'load',
    )
    await page.keyboard.up('j')
    await page.keyboard.press('p')
    await page.locator('.trick-hud[data-phase="ready"]').waitFor()
    await page.keyboard.down('j')
    await charged()
    await page.keyboard.down('ArrowRight')
    await page.keyboard.up('j')
    await page.locator('.trick-hud[data-phase="flight"]').waitFor()
    await page.keyboard.up('ArrowRight')
    await page.locator('.trick-hud[data-stance="switch"]').waitFor()
    assert.match(
      await page.locator('.trick-hud .hud-kicker').innerText(),
      /clean landing \+190/i,
    )
    await page.getByRole('button', { name: 'End run', exact: true }).click()
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('fallline.runs') || '[]').length === 1,
    )
    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem('fallline.runs'))[0],
    )
    assert.equal(saved.freestyle.attempts, 1)
    assert.equal(saved.freestyle.landed, 1)
    assert.equal(saved.freestyle.points, 190)
    assert.deepEqual(errors, [])
  },
)
