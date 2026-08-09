import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('mobile users can open navigation and create a project', async ({
  page,
}) => {
  await page.goto('/app')

  await expect(
    page.getByRole('button', { name: 'Toggle Sidebar' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Browse projects' }).click()

  const sidebar = page.locator('[data-sidebar="sidebar"][data-mobile="true"]')
  await expect(sidebar).toBeVisible()
  await expect(sidebar.getByText('Writing Assistant')).toBeVisible()

  await sidebar.getByTitle('New Project').click()
  const projectName = `Mobile project ${Date.now()}`
  await page.getByPlaceholder('Project name').fill(projectName)
  await page.getByRole('button', { name: 'Create Project' }).click()

  await expect(page).toHaveURL(/\/app\/project\//)
  await expect(sidebar).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Project Settings' })).toBeVisible()
})
