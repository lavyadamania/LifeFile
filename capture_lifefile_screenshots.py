import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = r"e:\ie proj\lifefile_screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def capture_all():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()

        print("1. Capturing Login Page...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "01_login_page.png"), full_page=False)

        print("2. Logging in as Doctor...")
        # Check if doctor pill exists
        try:
            # Click doctor demo button or login directly
            doctor_pill = page.locator("text=Dr. Ananya Sharma").first
            if doctor_pill.is_visible():
                doctor_pill.click()
                time.sleep(1)
            else:
                page.fill("input[type=email]", "ananya.sharma@lifefile.com")
                page.fill("input[type=password]", "Demo@123")
                page.click("button:has-text('Login')")
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "02_doctor_queue.png"), full_page=False)
        except Exception as e:
            print("Doctor login note:", e)

        print("3. Navigating to Doctor Schedule / Queue...")
        try:
            page.goto("http://localhost:5173/doctor/queue", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "03_doctor_live_queue.png"), full_page=False)
        except Exception as e:
            print("Queue nav error:", e)

        print("4. Navigating to Doctor Records & Memory...")
        try:
            page.goto("http://localhost:5173/doctor/records", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "04_doctor_patient_memory.png"), full_page=False)
        except Exception as e:
            print("Records nav error:", e)

        print("5. Logging in as Patient / Viewing Patient Features...")
        try:
            page.goto("http://localhost:5173", wait_until="networkidle")
            time.sleep(1)
            patient_pill = page.locator("text=Patient").first
            if patient_pill.is_visible():
                patient_pill.click()
                time.sleep(1)
            else:
                page.fill("input[type=email]", "patient01@lifefile.com")
                page.fill("input[type=password]", "Demo@123")
                page.click("button:has-text('Login')")
            time.sleep(2)
        except Exception as e:
            print("Patient login note:", e)

        print("6. Capturing AI Predictor...")
        try:
            page.goto("http://localhost:5173/patient/predictor", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "05_ai_risk_predictor.png"), full_page=False)
        except Exception as e:
            print("Predictor error:", e)

        print("7. Capturing Symptom Triage...")
        try:
            page.goto("http://localhost:5173/patient/symptoms", wait_until="networkidle")
            time.sleep(2)
            # Fill sample symptoms to show real-time NLP
            input_box = page.locator("textarea").first
            if input_box.is_visible():
                input_box.fill("Severe crushing chest pain radiating to left arm with difficulty breathing")
                time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_nlp_symptom_triage.png"), full_page=False)
        except Exception as e:
            print("Symptom error:", e)

        print("8. Capturing Patient Queue Status...")
        try:
            page.goto("http://localhost:5173/patient/queue", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "07_patient_live_eta.png"), full_page=False)
        except Exception as e:
            print("Patient queue error:", e)

        print("9. Capturing Streamlit / Power BI Operational Dashboard...")
        try:
            page.goto("http://localhost:8511", wait_until="networkidle")
            time.sleep(4)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "08_operational_bi_dashboard.png"), full_page=False)
        except Exception as e:
            print("BI dashboard error:", e)

        browser.close()
        print("All screenshots successfully captured!")

if __name__ == "__main__":
    capture_all()
