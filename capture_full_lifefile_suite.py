import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = r"e:\ie proj\lifefile_screenshots"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def capture():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. Capture Login Page
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        print("Capturing 01_login_page...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "01_login_page.png"))

        # 2. Doctor Session
        print("Logging in as Doctor...")
        page.click("button:has-text('Doctor')")
        time.sleep(0.5)
        # click first doctor quick pick or fill
        doctor_btn = page.locator("button:has-text('Dr.')").first
        if doctor_btn.is_visible():
            doctor_btn.click()
            time.sleep(1)
        else:
            page.fill("input[type=email]", "demo.doctor.vikram@lifefile.test")
            page.fill("input[type=password]", "Demo@123")
            page.click("button:has-text('Sign In'), button:has-text('Login')")
        time.sleep(2)

        print("Capturing 02_doctor_queue...")
        page.goto("http://localhost:5173/doctor/queue", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "02_doctor_queue.png"))

        print("Capturing 03_doctor_records...")
        page.goto("http://localhost:5173/doctor/records", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "03_doctor_records.png"))

        print("Capturing 04_doctor_dashboard...")
        page.goto("http://localhost:5173/doctor/dashboard", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "04_doctor_dashboard.png"))

        context.close()

        # 3. Patient Session
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(1)
        print("Logging in as Patient...")
        patient_tab = page.locator("button:has-text('Patient')").first
        if patient_tab.is_visible():
            patient_tab.click()
            time.sleep(0.5)
        patient_btn = page.locator("button:has-text('P01')").first
        if patient_btn.is_visible():
            patient_btn.click()
            time.sleep(1)
        else:
            page.fill("input[type=email]", "demo.patient.01@lifefile.test")
            page.fill("input[type=password]", "Demo@123")
            page.click("button:has-text('Sign In'), button:has-text('Login')")
        time.sleep(2)

        print("Capturing 05_patient_dashboard...")
        page.goto("http://localhost:5173/patient/dashboard", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "05_patient_dashboard.png"))

        print("Capturing 06_patient_live_eta...")
        page.goto("http://localhost:5173/patient/queue", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "06_patient_live_eta.png"))

        print("Capturing 07_patient_symptoms...")
        page.goto("http://localhost:5173/patient/symptoms", wait_until="networkidle")
        time.sleep(2)
        try:
            ta = page.locator("textarea").first
            if ta.is_visible():
                ta.fill("Severe persistent cough with high fever and chest tightness")
                time.sleep(1)
        except:
            pass
        page.screenshot(path=os.path.join(OUTPUT_DIR, "07_patient_symptoms.png"))

        print("Capturing 08_patient_predictor...")
        page.goto("http://localhost:5173/patient/predictor", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "08_patient_predictor.png"))

        print("Capturing 09_patient_timeline...")
        page.goto("http://localhost:5173/patient/timeline", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "09_patient_timeline.png"))

        context.close()

        # 4. Admin Session (Benchmark & Hospital Analytics)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(1)
        print("Logging in as Admin...")
        admin_tab = page.locator("button:has-text('Admin')").first
        if admin_tab.is_visible():
            admin_tab.click()
            time.sleep(0.5)
        admin_btn = page.locator("button:has-text('System Admin')").first
        if admin_btn.is_visible():
            admin_btn.click()
            time.sleep(1)
        else:
            page.fill("input[type=email]", "admin@lifefile.test")
            page.fill("input[type=password]", "Demo@123")
            page.click("button:has-text('Sign In'), button:has-text('Login')")
        time.sleep(2)

        print("Capturing 10_admin_benchmark...")
        page.goto("http://localhost:5173/admin/benchmark", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "10_admin_benchmark.png"))

        print("Capturing 11_hospital_analytics...")
        page.goto("http://localhost:5173/hospital/analytics", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "11_hospital_analytics.png"))

        context.close()

        # 5. Streamlit / Power BI Dashboard (Port 8511)
        print("Capturing 12_operational_bi_dashboard...")
        context = browser.new_context(viewport={'width': 1440, 'height': 1000})
        page = context.new_page()
        try:
            page.goto("http://localhost:8511", wait_until="networkidle")
            time.sleep(4)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "12_operational_bi_dashboard.png"))
        except Exception as e:
            print("BI capture note:", e)
        context.close()

        browser.close()
        print("All screenshots successfully captured!")

if __name__ == "__main__":
    capture()
