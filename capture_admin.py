import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('http://localhost:5173/login', wait_until='networkidle')
    time.sleep(1)
    admin_btn = page.locator("button:has-text('Admin Lavya')").first
    if admin_btn.is_visible():
        admin_btn.click()
        time.sleep(3)
        print('Admin logged in! URL:', page.url)
        page.goto('http://localhost:5173/admin/benchmark', wait_until='networkidle')
        time.sleep(2)
        page.screenshot(path='e:/ie proj/lifefile_screenshots/10_admin_benchmark.png')
        print('Captured 10_admin_benchmark.png')
        page.goto('http://localhost:5173/admin/analytics', wait_until='networkidle')
        time.sleep(2)
        page.screenshot(path='e:/ie proj/lifefile_screenshots/11_admin_analytics.png')
        print('Captured 11_admin_analytics.png')
    browser.close()
