from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Dashboard page
            page.goto("http://localhost:3000")
            page.wait_for_selector("h1:has-text('Customer Management')", timeout=30000)
            page.screenshot(path="jules-scratch/verification/01_dashboard.png")

            # Suppliers page
            page.goto("http://localhost:3000/suppliers")
            page.wait_for_selector("h1:has-text('Suppliers')", timeout=30000)
            page.screenshot(path="jules-scratch/verification/02_suppliers.png")

            # Inventory page
            page.goto("http://localhost:3000/inventory")
            page.wait_for_selector("h1:has-text('Fabric Inventory')", timeout=30000)
            page.screenshot(path="jules-scratch/verification/03_inventory.png")

            print("Verification script completed successfully!")

        except Exception as e:
            print(f"An error occurred: {e}")
            page.screenshot(path="jules-scratch/verification/error.png")

        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()