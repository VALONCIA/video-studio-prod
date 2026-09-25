import { expect, test } from '@playwright/test';

test('navigates between the routed placeholders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AdCut Web' })).toBeVisible();
  await page.getByRole('link', { name: 'Foundation', exact: true }).click();
  await expect(page).toHaveURL('/foundation/check');
  await expect(
    page.getByRole('heading', { name: 'Web foundation' }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'AdCut Web' })).toBeVisible();
});

test('loads and refreshes a nested URL from the production build', async ({
  page,
}) => {
  await page.goto('/foundation/check');
  await expect(
    page.getByRole('heading', { name: 'Web foundation' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Web foundation' }),
  ).toBeVisible();
});
