import json, os, sys, time, signal, random
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apply_linkedin import apply_to_jobs

# unbuffer stdout/stderr so UI sees lines immediately
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

HERE        = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(HERE, "config.json")
PID_PATH    = os.path.join(HERE, "scheduler.pid")

def load_interval() -> int:
    try:
        cfg = json.load(open(CONFIG_PATH))
        return int(cfg.get("interval_minutes", 60))
    except:
        return 60

def job_wrapper():
    now = datetime.now().isoformat()
    # add small random sleep up to ±5 minutes
    jitter = random.uniform(-300, 300)
    if jitter:
        print(f"[{now}] 🌪️  Sleeping {jitter:.0f}s jitter…")
        time.sleep(jitter)
    now = datetime.now().isoformat()
    print(f"[{now}] ▶️  Scheduled run starting…")
    try:
        apply_to_jobs(limit=10)
    except Exception as e:
        print(f"[{datetime.now().isoformat()}] ❌  Error:", e)
    else:
        print(f"[{datetime.now().isoformat()}] ✅  Finished.")

def write_pid():
    with open(PID_PATH, "w") as f:
        f.write(str(os.getpid()))

def remove_pid():
    try: os.remove(PID_PATH)
    except: pass

if __name__ == "__main__":
    write_pid()
    interval = load_interval()
    print(f"[{datetime.now().isoformat()}] Starting interval scheduler every {interval}m…")

    trigger   = IntervalTrigger(minutes=interval)
    scheduler = BackgroundScheduler()
    scheduler.add_job(job_wrapper, trigger)
    scheduler.start()

    def _shutdown(signum, frame):
        print(f"[{datetime.now().isoformat()}] Shutting down…")
        scheduler.shutdown(wait=False)
        remove_pid()
        sys.exit(0)

    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, _shutdown)

    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        _shutdown(None, None)
