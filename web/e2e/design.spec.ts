import { expect, test } from '@playwright/test';

test('design controls keep 44px targets and visible keyboard focus', async ({
  page,
}) => {
  await page.goto('/foundation/check');
  const controls = [
    page.getByRole('button', { name: 'Primary action' }),
    page.getByRole('button', { name: 'Secondary action' }),
    page.getByRole('button', { name: 'Help about controls' }),
    page.getByRole('radio', { name: 'First' }),
    page.getByRole('radio', { name: 'Second' }),
  ];
  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }

  await page.getByRole('button', { name: 'Primary action' }).focus();
  await page.keyboard.press('Tab');
  const secondary = page.getByRole('button', { name: 'Secondary action' });
  await expect(secondary).toBeFocused();
  await expect(secondary).toHaveCSS('outline-style', 'solid');

  await page.getByRole('radio', { name: 'First' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Second' })).toBeChecked();
});

test('reduced motion removes interaction movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/foundation/check');
  const primary = page.getByRole('button', { name: 'Primary action' });
  const transitionSeconds = await primary.evaluate((element) =>
    Number.parseFloat(
      element.ownerDocument.defaultView!.getComputedStyle(element)
        .transitionDuration,
    ),
  );
  expect(transitionSeconds).toBeLessThan(0.001);
  await primary.click();
  await expect(primary).toHaveCSS('transform', 'none');
});

test('workspace keeps the right panes available at both breakpoints', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.goto('/foundation/check?workspacePreview');
  const sources = page.getByRole('complementary', { name: 'Sources' });
  const canvas = page.getByRole('region', { name: 'Review canvas' });
  const inspector = page.getByRole('complementary', { name: 'Adjust' });

  await expect(sources).toBeVisible();
  await expect(canvas).toBeVisible();
  await expect(inspector).toBeVisible();

  await page.setViewportSize({ width: 1359, height: 900 });
  await expect(
    page.getByRole('navigation', { name: 'Workspace panes' }),
  ).toBeHidden();
  await expect(sources).toBeHidden();
  await expect(canvas).toBeVisible();
  await expect(inspector).toBeVisible();
  await page.getByRole('button', { name: 'Show sources' }).click();
  await expect(sources).toBeVisible();

  await page.setViewportSize({ width: 960, height: 900 });
  await expect(
    page.getByRole('navigation', { name: 'Workspace panes' }),
  ).toBeHidden();
  await expect(canvas).toBeVisible();
  await expect(inspector).toBeVisible();
  await page.getByRole('button', { name: 'Hide sources' }).click();
  await expect(sources).toBeHidden();
  await page.getByRole('button', { name: 'Show sources' }).click();
  await expect(sources).toBeVisible();

  await page.setViewportSize({ width: 959, height: 900 });
  await expect(
    page.getByRole('navigation', { name: 'Workspace panes' }),
  ).toBeVisible();
  await expect(canvas).toBeVisible();
  await expect(inspector).toBeHidden();
  await page.getByRole('button', { name: 'Adjust' }).click();
  await expect(inspector).toBeVisible();
  await expect(canvas).toBeHidden();
  await page.getByRole('button', { name: 'Sources' }).click();
  await expect(sources).toBeVisible();
  await expect(inspector).toBeHidden();
  await expect(page.getByText('Cut context')).toBeVisible();
  await expect(page.getByText('Version context')).toBeVisible();
});

test('recovery actions use full-size keyboard-focused controls', async ({
  page,
}) => {
  const recoveries = [
    {
      url: '/foundation/check?recoveryPreview=app',
      role: 'button',
      name: 'Reload',
    },
    {
      url: '/foundation/check?recoveryPreview=route',
      role: 'button',
      name: 'Try again',
    },
    { url: '/missing-page', role: 'link', name: 'Return home' },
  ] as const;

  for (const recovery of recoveries) {
    await page.goto(recovery.url);
    const action = page.getByRole(recovery.role, { name: recovery.name });
    await expect(action).toBeVisible();
    const box = await action.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
    await page.getByRole('link', { name: 'Foundation' }).focus();
    await page.keyboard.press('Tab');
    await expect(action).toBeFocused();
    await expect(action).toHaveCSS('outline-style', 'solid');
    if (recovery.name === 'Try again') {
      await action.click();
      await expect(page).toHaveURL('/foundation/check');
    }
  }
  await page.getByRole('link', { name: 'Return home' }).click();
  await expect(page).toHaveURL('/');
});
