from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000/cashbook")

        # Wait for the main heading to be visible to ensure the page has loaded
        expect(page.get_by_role("heading", name="Cash Book")).to_be_visible(timeout=30000)

        # Wait for the transactions to load, check for a known text
        expect(page.get_by_text("Monthly Summary")).to_be_visible(timeout=30000)

        page.screenshot(path="jules-scratch/verification/cashbook.png")
        print("Screenshot taken successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
        # Capture a screenshot even on failure for debugging
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)