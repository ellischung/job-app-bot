from playwright.sync_api import sync_playwright
import json
import time
from datetime import datetime
import sqlite3
import os

# Load config
with open('config.json', 'r') as f:
    config = json.load(f)

def log_application(job_title, company_name, job_link, status):
    # Connect to SQLite database (or create if doesn't exist)
    conn = sqlite3.connect('job_applications.db')
    cursor = conn.cursor()

    # Create table if it doesn't exist
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

    # Insert application log
    cursor.execute('''
        INSERT INTO applied_jobs (timestamp, platform, job_title, company, job_url, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (datetime.now().isoformat(), 'LinkedIn', job_title, company_name, job_link, status))

    conn.commit()
    conn.close()

def apply_to_jobs():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=50)  # headless=False to watch; change to True later
        context = browser.new_context()

        page = context.new_page()

        # Go to LinkedIn Login
        page.goto('https://www.linkedin.com/login')

        # Login
        page.fill('input[name="session_key"]', config['linkedin_email'])
        page.fill('input[name="session_password"]', config['linkedin_password'])
        page.click('button[type="submit"]')

        time.sleep(5)  # Wait for login

        # Search Jobs
        keywords = "+".join(config['linkedin_keywords'])
        location = config['location'].replace(" ", "%20")

        search_url = f'https://www.linkedin.com/jobs/search/?keywords={keywords}&location={location}&f_AL=true'
        page.goto(search_url)

        time.sleep(5)  # Let page load

        job_links = page.query_selector_all('a.job-card-list__title')

        print(f"Found {len(job_links)} jobs.")

        for job_link in job_links:
            try:
                job_link.click()
                time.sleep(2)

                # Check if Easy Apply button exists
                if page.is_visible('button.jobs-apply-button'):
                    page.click('button.jobs-apply-button')
                    time.sleep(2)

                    # Fill basic application
                    if page.is_visible('input[name="file"]'):
                        page.set_input_files('input[name="file"]', config['resume_path'])
                    
                    if page.is_visible('button[aria-label="Submit application"]'):
                        page.click('button[aria-label="Submit application"]')
                        print("Applied successfully!")

                        # Log success
                        job_title = page.inner_text('h2.topcard__title') if page.is_visible('h2.topcard__title') else "Unknown Title"
                        company_name = page.inner_text('span.topcard__flavor') if page.is_visible('span.topcard__flavor') else "Unknown Company"
                        job_url = page.url
                        log_application(job_title, company_name, job_url, "success")

                        time.sleep(2)

                        if page.is_visible('button[aria-label="Dismiss"]'):
                            page.click('button[aria-label="Dismiss"]')

                    else:
                        print("Submit button not found. Skipping.")

                else:
                    print("No Easy Apply button. Skipping.")

            except Exception as e:
                print(f"Error during job application: {e}")
                continue

        browser.close()

if __name__ == "__main__":
    apply_to_jobs()
