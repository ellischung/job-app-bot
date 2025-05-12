import sqlite3
import pandas as pd

conn = sqlite3.connect("job_applications.db")
df = pd.read_sql_query("SELECT * FROM applied_jobs", conn)
conn.close()

# export to csv file
output_file = "job_applications.csv"
df.to_csv(output_file, index=False)

print(f"✅ Exported {len(df)} rows to {output_file}")