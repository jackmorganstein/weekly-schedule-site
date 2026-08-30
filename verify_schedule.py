from pathlib import Path
import urllib.request

root = Path('C:/Users/jack/weekly-schedule-site')
html = urllib.request.urlopen('http://localhost:8000').read().decode('utf-8')
js = (root / 'app.js').read_text(encoding='utf-8')

assert 'value="Sunday">Sunday' in html
assert 'const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];' in js
assert 'Shacharit' in js and 'Night Seder' in js
print('Verified: Sunday-first week and default timetable are present in the served app.')
