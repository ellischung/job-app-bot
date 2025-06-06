import sys
from playwright.sync_api import sync_playwright
import json
import time
import random
import db

# Update std to show in UI
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Default answers
EXP_DEF = "3"
YES_NO = {"yes", "no"}

# Load config
with open("config.json") as f:
    config = json.load(f)

def cleanup_modals(page):
    if page.is_visible('button[aria-label="Dismiss"]'):
        page.click('button[aria-label="Dismiss"]')
        time.sleep(1)
    if page.is_visible('button:has-text("Discard")'):
        page.click('button:has-text("Discard")')
        time.sleep(1)

def fill_all_blanks(page):
    dialog = page.query_selector('div[role="dialog"]')
    if not dialog:
        return

    # 1) Location → home_address
    for block in dialog.query_selector_all("div.fb-dash-form-element"):
        lbl = block.query_selector("label")
        q = lbl.inner_text().strip().lower() if lbl else ""
        if "location" in q:
            ctl = block.query_selector("input, textarea, select")
            if ctl:
                ctl.fill(config["home_address"])
                print(f"[OK] Filled '{q}' with home address")
            continue

    # 2) Radios
    for r in dialog.query_selector_all('input[type="radio"][value="Yes"]:not(:checked)'):
        rid = r.get_attribute("id")
        lbl = dialog.query_selector(f'label[for="{rid}"]') if rid else None
        if lbl:
            lbl.click()
            print("[OK] Auto‑selected radio 'Yes'")
            time.sleep(0.2)

    # 3) Selects
    for ctl in dialog.query_selector_all('select'):
        opts = [o.inner_text().strip().lower() for o in ctl.query_selector_all('option')]
        curr = ctl.input_value().strip().lower()
        if curr in ("", "select an option"):
            if "yes" in opts and "no" in opts:
                ctl.select_option(index=opts.index("yes"))
                print("[OK] Auto‑selected dropdown 'Yes'")
            elif all(opt.isdigit() for opt in opts):
                ctl.select_option(value=EXP_DEF)
                print(f"[OK] Auto‑selected dropdown '{EXP_DEF}'")
            time.sleep(0.2)

    # 4) Text inputs
    for ctl in dialog.query_selector_all(
        'input:not([type="hidden"]):not([type="file"]):not([type="radio"]), textarea'
    ):
        if not ctl.input_value().strip():
            ctl.fill(EXP_DEF)
            print(f"[OK] Auto‑filled input '{EXP_DEF}'")

def apply_to_jobs(limit: int = 5):
    # ensure our table exists
    db.init_db()

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
        to_apply = min(limit, total)
        print(f"Found {total} jobs. Attempting up to {to_apply}...")

        for i in range(limit):
            try:
                card = cards[i]

                # EXTRACT title & company name
                title_el = card.query_selector('span[aria-hidden="true"]')
                job_title = title_el.inner_text().strip() if title_el else (card.get_attribute("aria-label") or "Unknown")
                company_name = card.evaluate("""el => {
                    const root = el.closest('div.job-card-container');
                    const sub  = root?.querySelector('.artdeco-entity-lockup__subtitle span');
                    return sub ? sub.innerText.trim() : '';
                }""") or "Unknown"

                # navigate into the job detail page
                card.click()
                time.sleep(random.uniform(2,5))
                job_url = page.url

                if db.already_applied(job_url):
                    print("⚠️ Already applied—skipping")
                    continue
                if not page.is_visible("button.jobs-apply-button"):
                    print("No Easy Apply—skipping")
                    continue

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
                        print("[SUCCESS] Application submitted")
                        db.log_application(job_title, company_name, job_url, "success")

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
                        time.sleep(random.uniform(2,4))
                        continue

                    if (page.is_visible('button[aria-label="Continue to next step"]') or
                        page.is_visible('button:has-text("Next")')):
                        page.click(
                          'button[aria-label="Continue to next step"],'
                          ' button:has-text("Next")'
                        )
                        print("Clicked Next")
                        time.sleep(random.uniform(2,4))
                        continue

                    break

                cleanup_modals(page)

            except Exception as e:
                print("Error during job application:", e)
                cleanup_modals(page)

        browser.close()

if __name__ == "__main__":
    apply_to_jobs()
