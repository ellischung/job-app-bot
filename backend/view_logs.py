import sqlite3
import pandas as pd

conn = sqlite3.connect("job_applications.db")
df = pd.read_sql_query("SELECT * FROM applied_jobs", conn)
conn.close()

print(df.to_markdown(index=False))