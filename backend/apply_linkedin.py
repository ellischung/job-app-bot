from playwright.sync_api import sync_playwright
import json
import time
import random
import sqlite3
from datetime import datetime

# Default answers
EXP_DEF = "3"
YES_NO = {"yes", "no"}

# Load config
with open("config.json") as f:
    config = json.load(f)

def log_application(title, company, url, status):
    conn = sqlite3.connect("job_applications.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS applied_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            platform TEXT,
            job_title TEXT,
            company TEXT,
            job_url TEXT,
            status TEXT
        )
    """)
    c.execute("""
        INSERT INTO_applied_jobs (timestamp,platform,job_title,company,job_url,status)
        VALUES (?,?,?,?,?,?)
    """, (datetime.now().isoformat(), "LinkedIn", title, company, url, status))
    conn.commit()
    conn.close()

def already_applied(url):
    conn = sqlite3.connect("job_applications.db")
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM applied_jobs WHERE job_url = ?", (url,))
    count = c.fetchone()[0]
    conn.close()
    return count > 0

def cleanup_modals(page):
    # dismiss any stray modal  
    if page.is_visible('button[aria-label="Dismiss"]'):
        page.click('button[aria-label="Dismiss"]'); time.sleep(1)
    if page.is_visible('button:has-text("Discard")'):
        page.click('button:has-text("Discard")'); time.sleep(1)

def fill_all_blanks(page):
    dialog = page.query_selector('div[role="dialog"]')
    if not dialog:
        return

    # 1) Radios → click the 'Yes' label
    for r in dialog.query_selector_all('input[type="radio"][value="Yes"]:not(:checked)'):
        rid = r.get_attribute("id")
        lbl = dialog.query_selector(f'label[for="{rid}"]') if rid else None
        if lbl:
            lbl.click()
            print("✔️ Auto-selected radio 'Yes'")
            time.sleep(0.2)

    # 2) Selects (catch placeholder "Select an option" as blank)
    for ctl in dialog.query_selector_all('select'):
        opts = [o.inner_text().strip().lower() for o in ctl.query_selector_all('option')]
        current = ctl.input_value().strip().lower()
        if current in ("", "select an option"):
            if "yes" in opts and "no" in opts:
                ctl.select_option(index=opts.index("yes"))
                print("✔️ Auto-selected dropdown 'Yes'")
                time.sleep(0.2)
            elif all(opt.isdigit() for opt in opts):
                ctl.select_option(value=EXP_DEF)
                print(f"✔️ Auto-selected dropdown '{EXP_DEF}'")
                time.sleep(0.2)

    # 3) Text inputs & textareas
    for ctl in dialog.query_selector_all(
        'input:not([type="hidden"]):not([type="file"]):not([type="radio"]), textarea'
    ):
        if not ctl.input_value().strip():
            ctl.fill(EXP_DEF)
            print(f"✔️ Auto-filled input '{EXP_DEF}'")

def apply_to_jobs():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=50)
        page = browser.new_context().new_page()

        # — Login —
        page.goto("https://www.linkedin.com/login")
        page.fill('input[name="session_key"]', config["linkedin_email"])
        page.fill('input[name="session_password"]', config["linkedin_password"])
        page.click('button[type="submit"]')
        time.sleep(5)

        # — Search —
        kw  = "+".join(config["linkedin_keywords"])
        loc = config["location"].replace(" ", "%20")
        page.goto(
          f"https://www.linkedin.com/jobs/search/"
          f"?keywords={kw}&location={loc}&f_AL=true"
        )
        time.sleep(5)

        cards = page.query_selector_all("a.job-card-container__link")
        total = len(cards)
        limit = min(5, total)
        print(f"Found {total} jobs. Attempting up to {limit}...")

        for i in range(limit):
            try:
                cards[i].click()
                time.sleep(random.uniform(2,5))
                url = page.url

                if already_applied(url):
                    print("⚠️ Already applied—skipping"); continue
                if not page.is_visible("button.jobs-apply-button"):
                    print("No Easy Apply—skipping"); continue

                # — Easy Apply —
                page.click("button.jobs-apply-button")
                time.sleep(random.uniform(2,5))
                if page.is_visible('input[name="file"]'):
                    page.set_input_files('input[name="file"]', config["resume_path"])

                # — Multi‑step form —
                for _ in range(5):
                    fill_all_blanks(page)

                    if page.is_visible('button[aria-label="Submit application"]'):
                        page.click('button[aria-label="Submit application"]')
                        print("✅ Application submitted")
                        title = (page.inner_text('h2.topcard__title')
                                 if page.is_visible('h2.topcard__title') else "Unknown")
                        comp  = (page.inner_text('span.topcard__flavor')
                                 if page.is_visible('span.topcard__flavor') else "Unknown")
                        log_application(title, comp, url, "success")

                        # close any post‑submit modal
                        for sel in [
                            'button.artdeco-modal__dismiss',
                            'button[data-test-modal-close-btn]',
                            'button[aria-label="Dismiss"]',
                            'button:has-text("Close")',
                            'button:has-text("Done")'
                        ]:
                            if page.is_visible(sel):
                                page.click(sel)
                                time.sleep(1)
                                break
                        break

                    if page.is_visible('button[aria-label="Review your application"]'):
                        page.click('button[aria-label="Review your application"]')
                        print("Clicked Review")
                        time.sleep(random.uniform(2,4)); continue

                    if ( page.is_visible('button[aria-label="Continue to next step"]') or
                         page.is_visible('button:has-text("Next")') ):
                        page.click(
                          'button[aria-label="Continue to next step"],'
                          ' button:has-text("Next")'
                        )
                        print("Clicked Next")
                        time.sleep(random.uniform(2,4)); continue

                    break

                cleanup_modals(page)

            except Exception as e:
                print("Error during job application:", e)
                cleanup_modals(page)

        browser.close()

if __name__ == "__main__":
    apply_to_jobs()
