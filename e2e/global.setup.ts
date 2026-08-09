import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { expect, test as setup } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

const authFile = 'playwright/.clerk/user.json'

setup.describe.configure({ mode: 'serial' })

setup('configure Clerk testing', async () => {
  await clerkSetup()
})

setup('authenticate the test user', async ({ page }) => {
  const emailAddress = process.env.E2E_CLERK_USER_EMAIL
  if (!emailAddress) throw new Error('E2E_CLERK_USER_EMAIL is required')
  const localPart = emailAddress.slice(0, emailAddress.indexOf('@'))
  if (!localPart.includes('+clerk_test')) {
    throw new Error(
      'E2E_CLERK_USER_EMAIL must be a dedicated +clerk_test address',
    )
  }

  await page.goto('/')
  await clerk.signIn({ page, emailAddress })
  await page.goto('/app')
  await expect(page).toHaveURL(/\/app/)
  await expect(page.getByText('Projects', { exact: true })).toBeVisible()
  await mkdir(dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
})
