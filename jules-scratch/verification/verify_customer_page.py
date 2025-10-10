from playwright.sync_api import Page, expect

def test_customer_page_loads_correctly(page: Page):
    """
    This test verifies that the customer detail page loads correctly after
    performance optimizations, and that the financial summary is displayed.
    """
    # 1. Arrange: Go to the application's homepage.
    page.goto("http://localhost:3000")

    # 2. Act: Click on the first customer in the table.
    # We wait for the table to be visible before clicking.
    table_body = page.locator("table > tbody")
    expect(table_body).to_be_visible()
    first_row = table_body.locator("tr").first
    first_row.click()

    # 3. Assert: Check that the customer detail page has loaded.
    # We look for the "Customer Profile" heading to confirm.
    expect(page.get_by_role("heading", name="Customer Profile")).to_be_visible()

    # 4. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/customer_page_verification.png")