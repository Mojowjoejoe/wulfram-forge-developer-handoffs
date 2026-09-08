import assert from 'node:assert/strict';
export async function testSearchUI({ button, field, evaluate, waitFor, screenshot, saved, step, original, report }) {
  if (process.env.WULFRAM_CRITIC_TEST === '1') {
    await button('Base builder');
    for (const [label, value] of [['Service radius',320], ['Backup radius',90], ['Maximum slope',21], ['Minimum spacing',9], ['Base layout name','Critic custom layout']]) {
      await evaluate(`(() => { const el = document.querySelector('input[aria-label="${label}"]'); if (!el) throw new Error('Missing control'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, ${JSON.stringify(String(value))}); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    }
    original = await saved();
    assert.equal(original.validation.serviceRadius, 320);
  }
  const status = () => evaluate(`document.querySelector('[data-testid="map-search-status"]')?.textContent ?? ''`);
  const applyEnabled = () => evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Apply passing candidate')); return !!b && !b.disabled; })()`);
  const unchanged = async () => assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('wulfram-forge-project-v1'))`), original);
  await button('Balanced');
  await step('Search cancellation terminates in-flight worker without changing map', async () => {
    await field('Layout preset', 'open-field'); await field('Grid vertices', 513); await field('Search seed limit', 30);
    await button('Find a passing map'); await button('Cancel search');
    assert.match(await status(), /cancelled/); assert.equal(await applyEnabled(), false); await unchanged();
  });
  await step('Changing settings invalidates in-flight search and passing previews', async () => {
    await button('Find a passing map'); await field('Terrain relief', 1190);
    await waitFor(async () => /Settings or map changed/.test(await status()), 'stale worker discarded');
    assert.equal(await applyEnabled(), false); await unchanged();
  });
  await step('Exhausted bounded search reports failures and never enables Apply', async () => {
    for (const [label,value] of [['Grid vertices',65], ['Terrain relief',1200], ['World width',3200], ['World height',3200], ['Route width',.5], ['Search seed limit',1]]) await field(label,value);
    await button('Find a passing map');
    await waitFor(async () => /No passing map after 1 seeds/.test(await status()), 'one-seed exhaustion');
    assert.equal(await applyEnabled(), false); await unchanged(); await screenshot('search-exhausted');
  });
  await step('Search returns passing preview while preserving all draft settings', async () => {
    for (const [label,value] of [['Grid vertices',65], ['Terrain relief',180], ['World width',5600], ['World height',5600], ['Route width',1.35], ['Starter base','curated-base-in-a-box'], ['Search seed limit',12]]) await field(label,value);
    if (process.env.WULFRAM_CRITIC_TEST === '1') await field('Reproducible seed', 'x'.repeat(200));
    const draft = () => evaluate(`[...document.querySelectorAll('[role="dialog"] input,[role="dialog"] select')].map(e => [e.closest('label')?.textContent,e.value])`);
    const before = await draft();
    await button('Find a passing map');
    await waitFor(async () => /Found passing seed:/.test(await status()), 'passing preview');
    assert.equal(await applyEnabled(), true); assert.deepEqual(await draft(), before); await unchanged();
    const layout = await evaluate(`(() => { const d = document.querySelector('[role="dialog"]'); return { width: d.clientWidth, contentWidth: d.scrollWidth }; })()`);
    assert.ok(layout.contentWidth <= layout.width + 2, `Dialog overflows horizontally: ${JSON.stringify(layout)}`);
    report.searchLayout = layout;
    report.searchStatus = await status(); await screenshot('search-found');
    await field('Central-area', 1.6);
    await waitFor(async () => !(await applyEnabled()), 'finished preview invalidated');
    await button('Find a passing map');
    await waitFor(async () => /Found passing seed:/.test(await status()), 'fresh passing preview');
    await button('Apply passing candidate');
    await waitFor(() => evaluate(`!document.querySelector('[role="dialog"]')`), 'explicit apply closes dialog');
    const applied = await saved(); assert.notDeepEqual(applied.terrain, original.terrain);
    assert.deepEqual(applied.validation, original.validation);
    if (process.env.WULFRAM_CRITIC_TEST === '1') assert.equal(applied.baseLayouts.find(l => l.id === applied.activeBaseLayoutId).name, 'Critic custom layout');
    report.appliedSearchSeed = applied.metadata['generator.seed'];
    await screenshot('search-applied');
  });
}
