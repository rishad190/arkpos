from playwright.sync_api import Page, expect

def test_dashboard_optimizations(page: Page):
    """
    This test verifies that the dashboard UI is responsive and that
    the search functionality works correctly after performance optimizations.
    """
    # 1. Arrange: Go to the application's homepage.
    # The dev server runs on localhost:3000 by default.
    page.goto("http://localhost:3000")

    # 2. Assert: Check that the main heading is visible.
    # This confirms the page has loaded correctly.
    heading = page.get_by_role("heading", name="Customer Management")
    expect(heading).to_be_visible()

    # 3. Act: Find the search input and type a search term.
    # We use a delay to simulate user typing and test the debouncing.
    search_input = page.get_by_placeholder("Search by name or phone...")
    expect(search_input).to_be_visible()
    search_input.type("Test Customer", delay=100)

    # 4. Wait for the debounced search to take effect.
    # A short wait ensures that the filtering has occurred.
    page.wait_for_timeout(500)

    # 5. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/dashboard_verification.png")