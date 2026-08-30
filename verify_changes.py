from pathlib import Path
import urllib.request

root = Path('C:/Users/jack/weekly-schedule-site')
html = urllib.request.urlopen('http://localhost:8000').read().decode('utf-8')
js = (root / 'app.js').read_text(encoding='utf-8')
css = (root / 'style.css').read_text(encoding='utf-8')

assert 'Edit' in js
assert 'notes: ""' in js
assert 'task-modal' in js
assert '@media (max-width: 768px)' in css
print('Verified: edit modal, default-note cleanup, and mobile layout updates are present in the app files.')
