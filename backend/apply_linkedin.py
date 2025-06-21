import sys
from playwright.sync_api import sync_playwright
import json
import time
import random
import db
import re

# Update std to show in UI
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Default answers
EXP_DEF = "3"
YES_NO = {"yes", "no"}

# Load config and overrides
overrides = {}
with open("config.json") as f:
    config = json.load(f)
    overrides = config.get("question_overrides", {})


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

    # process each question block
    for block in dialog.query_selector_all("div.fb-dash-form-element"):
        lbl = block.query_selector("label")
        q = lbl.inner_text().strip().lower() if lbl else ""

        # skip pre-filled "no" questions
        radios = block.query_selector_all('input[type="radio"]')
        if any(r.is_checked() and r.get_attribute("value").lower() == "no" for r in radios):
            continue

        # override from config.json patterns
        for pat, ans in overrides.items():
            if re.search(pat, q, re.IGNORECASE):
                # radio override
                if radios:
                    btn = block.query_selector(f'input[type="radio"][value="{ans.capitalize()}"]')
                    if btn and not btn.is_checked():
                        btn.click()
                        print(f"[OVERRIDE] {q} -> {ans}")
                        time.sleep(0.2)
                    break
                # select override
                sel = block.query_selector('select')
                if sel and not sel.input_value().strip():
                    val = config.get(ans.strip('_'), ans)
                    sel.select_option(label=val)
                    print(f"[OVERRIDE] {q} -> {val}")
                    time.sleep(0.2)
                    break
                # text override
                for ctl in block.query_selector_all(
                    'input:not([type="hidden"]):not([type="file"]):not([type="radio"]), textarea'
                ):
                    if not ctl.input_value().strip():
                        val = config.get(ans.strip('_'), ans)
                        ctl.fill(val)
                        print(f"[OVERRIDE] {q} -> {val}")
                        time.sleep(0.2)
                        break
                break

        else:
            # Handle location -> auto-fill with address
            if "location" in q:
                ctl = block.query_selector("input, textarea, select")
                if ctl:
                    ctl.fill(config["home_address"])
                    print(f"[OK] Filled '{q}' with home address")
                continue

            # Handle radios
            for r in block.query_selector_all('input[type="radio"][value="Yes"]:not(:checked)'):
                rid = r.get_attribute("id")
                lbl2 = dialog.query_selector(f'label[for="{rid}"]') if rid else None
                if lbl2:
                    lbl2.click()
                    print(f"[OK] {q} -> yes")
                    time.sleep(0.2)

            # Handle selects
            for ctl in block.query_selector_all('select'):
                opts = [o.inner_text().strip().lower() for o in ctl.query_selector_all('option')]
                curr = ctl.input_value().strip().lower()
                if curr in ("", "select an option"):
                    if "yes" in opts and "no" in opts:
                        ctl.select_option(index=opts.index("yes"))
                        print(f"[OK] {q} -> yes")
                    elif all(opt.isdigit() for opt in opts):
                        ctl.select_option(value=EXP_DEF)
                        print(f"[OK] {q} -> {EXP_DEF}")
                    time.sleep(0.2)

            # Handle text inputs
            for ctl in block.query_selector_all(
                'input:not([type="hidden"]):not([type="file"]):not([type="radio"]), textarea'
            ):
                if not ctl.input_value().strip():
                    ctl.fill(EXP_DEF)
                    print(f"[OK] {q} -> {EXP_DEF}")
                    time.sleep(0.2)


def apply_to_jobs(limit: int = 5):
    # ensure our table exists
    db.init_db()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=50)
        page = browser.new_context().new_page()

        # Login to Linkedin
        page.goto("https://www.linkedin.com/login")
        page.fill('input[name="session_key"]', config["linkedin_email"])
        page.fill('input[name="session_password"]', config["linkedin_password"])
        page.click('button[type="submit"]')
        time.sleep(5)

        # Search for job
        kw  = "+".join(config["linkedin_keywords"])
        loc = config["location"].replace(" ", "%20")
        page.goto(
          f"https://www.linkedin.com/jobs/search/"
          f"?keywords={kw}&location={loc}&f_AL=true"
        )
        time.sleep(5)

        # Scroll window to exhaust more job apps
        prev_count = 0
        for _ in range(10):
            page.evaluate("window.scrollBy(0, document.body.scrollHeight)")
            time.sleep(1)
            cards_now = page.query_selector_all("a.job-card-container__link")
            if len(cards_now) == prev_count:
                break
            prev_count = len(cards_now)

        cards = page.query_selector_all("a.job-card-container__link")
        total = len(cards)
        print(f"{total} jobs found. {limit} attempts queued.")

        success_count = 0
        idx = 0
        # Keep applying until 'limit' jobs applied or exhausted list
        while success_count < limit and idx < total:
            card = cards[idx]
            idx += 1
            try:
                # EXTRACT title & company name
                title_el = card.query_selector('span[aria-hidden="true"]')
                job_title = title_el.inner_text().strip() if title_el else (card.get_attribute("aria-label") or "Unknown")
                company_name = card.evaluate("""el => {
                    const root = el.closest('div.job-card-container');
                    const sub  = root?.querySelector('.artdeco-entity-lockup__subtitle span');
                    return sub ? sub.innerText.trim() : '';
                }""") or "Unknown"

                # navigate into job detail page
                card.click()
                time.sleep(random.uniform(2,5))
                job_url = page.url

                if db.already_applied(job_url):
                    print("⚠️ Already applied—skipping")
                    continue
                if not page.is_visible("button.jobs-apply-button"):
                    print("No Easy Apply—skipping")
                    continue

                # Easy Apply
                page.click("button.jobs-apply-button")
                time.sleep(random.uniform(2,5))
                if page.is_visible('input[name="file"]'):
                    page.set_input_files('input[name="file"]', config["resume_path"])

                # Multi-step form
                for _ in range(5):
                    fill_all_blanks(page)

                    if page.is_visible('button[aria-label="Submit application"]'):
                        page.click('button[aria-label="Submit application"]')
                        print("[SUCCESS] Application submitted")
                        db.log_application(job_title, company_name, job_url, "success")
                        success_count += 1

                        # close any post-submit modal
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