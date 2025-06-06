import json
import os
import sys
import time
import signal
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

# ensure python prints are unbuffered, so SSE will see them immediately
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# import apply jobs function
from apply_linkedin import apply_to_jobs

# paths
HERE = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(HERE, "config.json")
PID_PATH = os.path.join(HERE, "scheduler.pid")

def load_cron_expression() -> str:
    """
    Read the "schedule" field from config.json.
    Expecting something like "0 * * * *" (once every hour), etc.
    If missing or invalid, default to hourly.
    """
    try:
        with open(CONFIG_PATH) as f:
            cfg = json.load(f)
        expr = cfg.get("schedule", "").strip()
        if expr:
            return expr
    except Exception:
        pass

    # default: every hour at minute 0
    return "0 * * * *"

def job_wrapper():
    """
    Wrapper that calls apply_to_jobs(limit=10) and catches exceptions.
    """
    now = datetime.now().isoformat()
    print(f"[{now}] ▶️  Scheduled run starting…")
    try:
        # apply to 10 jobs to start
        apply_to_jobs(limit=10)
    except Exception as e:
        now = datetime.now().isoformat()
        print(f"[{now}] ❌  Error in scheduled run:", e)
    else:
        now = datetime.now().isoformat()
        print(f"[{now}] ✅  Scheduled run finished.")

def write_pid():
    """
    Write this process’s PID into scheduler.pid so that 'stop' route can kill it.
    """
    pid = os.getpid()
    with open(PID_PATH, "w") as f:
        f.write(str(pid))

def remove_pid():
    """
    Remove the PID file on shutdown.
    """
    if os.path.exists(PID_PATH):
        try:
            os.remove(PID_PATH)
        except:
            pass

if __name__ == "__main__":
    # write pid for stop endpoint to find and kill
    write_pid()

    # load cron
    cron_expr = load_cron_expression()
    print(f"[{datetime.now().isoformat()}] Starting scheduler with cron: {cron_expr}")

    parts = cron_expr.split()
    if len(parts) != 5:
        print(f"❗ Invalid schedule in config.json. Using default hourly.")
        parts = ["0", "*", "*", "*", "*"]

    trigger = CronTrigger(
        minute=parts[0],
        hour=parts[1],
        day=parts[2],
        month=parts[3],
        day_of_week=parts[4],
    )

    # start BackgroundScheduler so main can stay alive
    scheduler = BackgroundScheduler()
    scheduler.add_job(job_wrapper, trigger)
    scheduler.start()
    print(f"[{datetime.now().isoformat()}] Scheduler is now running in background.")

    # handle shutdown to remove pid file
    def _shutdown(signum, frame):
        print(f"[{datetime.now().isoformat()}] Shutting down scheduler…")
        scheduler.shutdown(wait=False)
        remove_pid()
        print("Goodbye.")
        sys.exit(0)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    # keep main thread alive
    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        _shutdown(None, None)
