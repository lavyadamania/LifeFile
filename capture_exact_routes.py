import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = r"e:\ie proj\lifefile_screenshots"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def capture_exact_routes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # --- PATIENT SESSION ---
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        page.goto("http://localhost:5173/login", wait_until="networkidle")
        time.sleep(1)

        # Login as Patient P01
        p01_btn = page.locator("button:has-text('P01')").first
        p01_btn.click()
        time.sleep(3)
        print("Logged in as Patient. Current URL:", page.url)

        # 1. Patient Live Queue (Home)
        page.goto("http://localhost:5173/patient", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "05_patient_live_queue.png"))
        print("Captured: 05_patient_live_queue.png")

        # 2. Patient AI Symptom Triage (/patient/ai-triage)
        page.goto("http://localhost:5173/patient/ai-triage", wait_until="networkidle")
        time.sleep(2)
        try:
            ta = page.locator("textarea").first
            if ta.is_visible():
                ta.fill("Patient experiencing severe crushing chest pain, diaphoresis, and left arm pain for 30 minutes")
                time.sleep(1)
        except:
            pass
        page.screenshot(path=os.path.join(OUTPUT_DIR, "06_patient_ai_triage.png"))
        print("Captured: 06_patient_ai_triage.png")

        # 3. Patient AI Risk Predictor (/patient/ai-predictor)
        page.goto("http://localhost:5173/patient/ai-predictor", wait_until="networkidle")
        time.sleep(2)
        try:
            calc = page.locator("button:has-text('Calculate')").first
            if calc.is_visible():
                calc.click()
                time.sleep(1)
        except:
            pass
        page.screenshot(path=os.path.join(OUTPUT_DIR, "07_patient_ai_predictor.png"))
        print("Captured: 07_patient_ai_predictor.png")

        # 4. Patient Memory View (/patient/memory)
        page.goto("http://localhost:5173/patient/memory", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "08_patient_memory_view.png"))
        print("Captured: 08_patient_memory_view.png")

        context.close()

        # --- DOCTOR SESSION ---
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        page.goto("http://localhost:5173/login", wait_until="networkidle")
        time.sleep(1)

        # Login as Doctor (Dr. Vikram Rao or Dr. Ananya)
        doc_btn = page.locator("button:has-text('Dr.')").first
        doc_btn.click()
        time.sleep(3)
        print("Logged in as Doctor. Current URL:", page.url)

        # 5. Doctor Live Queue (/doctor/queue)
        page.goto("http://localhost:5173/doctor/queue", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "02_doctor_queue_dashboard.png"))
        print("Captured: 02_doctor_queue_dashboard.png")

        # 6. Doctor Schedule (/doctor/schedule)
        page.goto("http://localhost:5173/doctor/schedule", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "03_doctor_schedule.png"))
        print("Captured: 03_doctor_schedule.png")

        # 7. Doctor Records (/doctor/records)
        page.goto("http://localhost:5173/doctor/records", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "04_doctor_records_memory.png"))
        print("Captured: 04_doctor_records_memory.png")

        context.close()

        # --- ADMIN SESSION ---
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        page.goto("http://localhost:5173/login", wait_until="networkidle")
        time.sleep(1)

        admin_btn = page.locator("button:has-text('Admin (1)')").first
        admin_btn.click()
        time.sleep(0.5)
        sys_admin = page.locator("button:has-text('System Admin')").first
        sys_admin.click()
        time.sleep(3)
        print("Logged in as Admin. Current URL:", page.url)

        # 8. Admin Benchmark Dashboard (/admin/benchmark)
        page.goto("http://localhost:5173/admin/benchmark", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "10_admin_benchmark.png"))
        print("Captured: 10_admin_benchmark.png")

        # 9. Admin Analytics (/admin/analytics)
        page.goto("http://localhost:5173/admin/analytics", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "11_admin_analytics.png"))
        print("Captured: 11_admin_analytics.png")

        context.close()

        browser.close()
        print("Exact route capturing completed successfully!")

if __name__ == "__main__":
    capture_exact_routes()
