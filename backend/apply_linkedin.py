from playwright.sync_api import sync_playwright
import json
import time
import random
from datetime import datetime
import sqlite3
import os

# Load config
with open('config.json', 'r') as f:
    config = json.load(f)

def log_application(job_title, company_name, job_link, status):
    conn = sqlite3.connect('job_applications.db')
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS applied_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            platform TEXT,
            job_title TEXT,
            company TEXT,
            job_url TEXT,
            status TEXT
        )
    ''')

    cursor.execute('''
        INSERT INTO applied_jobs (timestamp, platform, job_title, company, job_url, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (datetime.now().isoformat(), 'LinkedIn', job_title, company_name, job_link, status))

    conn.commit()
    conn.close()

def already_applied(job_url):
    """Check if this job URL already exists in the DB."""
    conn = sqlite3.connect('job_applications.db')
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM applied_jobs WHERE job_url = ?', (job_url,))
    count = cursor.fetchone()[0]
    conn.close()
    return count > 0

def cleanup_modals(page):
    """Dismiss or discard modals so the bot can move on safely."""
    if page.is_visible('button[aria-label="Dismiss"]'):
        page.click('button[aria-label="Dismiss"]')
        print("Clicked 'Dismiss' on Easy Apply modal.")
        time.sleep(2)
    if page.is_visible('button:has-text("Discard")'):
        page.click('button:has-text("Discard")')
        print("Clicked 'Discard' on Save modal.")
        time.sleep(2)

def apply_to_jobs():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=50)
        context = browser.new_context()
        page = context.new_page()

        # Login
        page.goto('https://www.linkedin.com/login')
        page.fill('input[name="session_key"]', config['linkedin_email'])
        page.fill('input[name="session_password"]', config['linkedin_password'])
        page.click('button[type="submit"]')
        time.sleep(5)

        # Job search
        keywords = "+".join(config['linkedin_keywords'])
        location = config['location'].replace(" ", "%20")
        search_url = f'https://www.linkedin.com/jobs/search/?keywords={keywords}&location={location}&f_AL=true'
        page.goto(search_url)
        time.sleep(5)

        job_links = page.query_selector_all('a.job-card-container__link')
        print(f"Found {len(job_links)} jobs.")
        job_links = job_links[:5]  # limit for safety
        print(f"Attempting up to {len(job_links)} job(s)...")

        for job_link in job_links:
            try:
                job_link.click()
                time.sleep(random.uniform(2, 5))

                job_url = page.url
                if already_applied(job_url):
                    print("⚠️ Already applied to this job. Skipping.")
                    continue

                if not page.is_visible('button.jobs-apply-button'):
                    print("No Easy Apply button. Skipping.")
                    continue

                page.click('button.jobs-apply-button')
                time.sleep(random.uniform(2, 5))

                if page.is_visible('input[name="file"]'):
                    page.set_input_files('input[name="file"]', config['resume_path'])

                attempts = 0
                while attempts < 5:
                    attempts += 1
                    time.sleep(random.uniform(2, 4))

                    # Check for validation errors
                    if page.is_visible('span:has-text("Enter a whole number")') or page.is_visible('[class*="artdeco-inline-feedback"]'):
                        print("Validation error detected. Skipping job.")
                        break

                    # Submit
                    if page.is_visible('button[aria-label="Submit application"]'):
                        submit_button = page.locator('button[aria-label="Submit application"]').first
                        submit_button.wait_for(state="visible", timeout=3000)
                        if submit_button.is_enabled():
                            submit_button.click()
                            print("Applied successfully!")

                            job_title = page.inner_text('h2.topcard__title') if page.is_visible('h2.topcard__title') else "Unknown Title"
                            company_name = page.inner_text('span.topcard__flavor') if page.is_visible('span.topcard__flavor') else "Unknown Company"
                            log_application(job_title, company_name, job_url, "success")

                            time.sleep(random.uniform(2, 4))
                            break
                        else:
                            print("Submit button disabled. Skipping job.")
                            break

                    # Review
                    elif page.is_visible('button[aria-label="Review your application"]'):
                        try:
                            review_button = page.locator('button[aria-label="Review your application"]').first
                            review_button.wait_for(state="visible", timeout=3000)
                            if review_button.is_enabled():
                                review_button.click()
                                print("Clicked 'Review your application'")
                                time.sleep(random.uniform(2, 4))
                            else:
                                print("Review button disabled. Skipping job.")
                                break
                        except:
                            print("Error handling Review button. Skipping job.")
                            break

                    # Next
                    elif page.is_visible('button[aria-label="Continue to next step"]') or page.is_visible('button:has-text("Next")'):
                        next_button = (
                            page.query_selector('button[aria-label="Continue to next step"]') or
                            page.query_selector('button:has-text("Next")')
                        )
                        if next_button and next_button.is_enabled():
                            next_button.click()
                            print("Clicked 'Next' to continue...")
                            time.sleep(random.uniform(2, 4))
                        else:
                            print("Next button disabled. Skipping job.")
                            break
                    else:
                        print("No relevant button found. Skipping job.")
                        break

                if attempts >= 5:
                    print("Too many steps. Skipping job.")

                cleanup_modals(page)

            except Exception as e:
                print(f"Error during job application: {e}")
                cleanup_modals(page)
                continue

        browser.close()

if __name__ == "__main__":
    apply_to_jobs()
