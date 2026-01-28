# Page Object Pattern

**Mandatory for all tests.** Encapsulates selectors and actions for reuse.

---

## Folder Structure

```
src/test/
  pages/           # Unit test page objects
    LoginPage.po.ts
    DocumentListPage.po.ts
  components/      # Component page objects
    DocumentCard.po.ts
    PersonaForm.po.ts
e2e/
  pages/           # E2E page objects
    EditorPage.ts
    SettingsPage.ts
smoke/
  pages/           # Smoke page objects (can share with e2e)
```

---

## Unit Test Page Object

```ts
// src/test/pages/LoginPage.po.ts
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

export class LoginPage {
  private user = userEvent.setup();

  // Getters for elements
  get emailInput() {
    return screen.getByRole("textbox", { name: /email/i });
  }

  get passwordInput() {
    return screen.getByLabelText(/password/i);
  }

  get submitButton() {
    return screen.getByRole("button", { name: /sign in/i });
  }

  get errorMessage() {
    return screen.queryByRole("alert");
  }

  // Actions
  async fillEmail(email: string) {
    await this.user.type(this.emailInput, email);
  }

  async fillPassword(password: string) {
    await this.user.type(this.passwordInput, password);
  }

  async submit() {
    await this.user.click(this.submitButton);
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}
```

---

## Component Page Object

For testing components in isolation with a scoped container:

```ts
// src/test/components/PersonaForm.po.ts
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

export class PersonaFormPO {
  private user = userEvent.setup();
  private container: HTMLElement;

  constructor(container?: HTMLElement) {
    this.container = container ?? document.body;
  }

  private get scope() {
    return within(this.container);
  }

  get nameInput() {
    return this.scope.getByRole("textbox", { name: /name/i });
  }

  get promptInput() {
    return this.scope.getByRole("textbox", { name: /prompt/i });
  }

  get saveButton() {
    return this.scope.getByRole("button", { name: /save/i });
  }

  async fillName(name: string) {
    await this.user.clear(this.nameInput);
    await this.user.type(this.nameInput, name);
  }

  async save() {
    await this.user.click(this.saveButton);
  }
}
```

---

## E2E/Playwright Page Object

```ts
// e2e/pages/EditorPage.ts
import { Page, Locator } from "@playwright/test";

export class EditorPage {
  readonly page: Page;
  readonly editor: Locator;
  readonly newDocButton: Locator;
  readonly documentList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editor = page.getByRole("textbox");
    this.newDocButton = page.getByRole("button", { name: /new document/i });
    this.documentList = page.getByTestId("document-list");
  }

  async goto() {
    await this.page.goto("/");
  }

  async createDocument(title: string) {
    await this.newDocButton.click();
    await this.page.getByRole("textbox", { name: /title/i }).fill(title);
    await this.page.getByRole("button", { name: /save/i }).click();
  }

  async getDocumentCount(): Promise<number> {
    return this.documentList.getByRole("listitem").count();
  }
}
```

---

## Usage Examples

### Unit Test

```ts
describe("LoginPage", () => {
  it("shows error on invalid credentials", async () => {
    render(<LoginPage />);
    const page = new LoginPagePO();

    await page.login("bad@email.com", "wrongpassword");

    expect(page.errorMessage).toHaveTextContent("Invalid credentials");
  });
});
```

### E2E Test

```ts
test("user can create document", async ({ page }) => {
  const editor = new EditorPage(page);
  await editor.goto();

  const initialCount = await editor.getDocumentCount();
  await editor.createDocument("New Document");

  expect(await editor.getDocumentCount()).toBe(initialCount + 1);
});
```
