import re
import time
import feedparser
import requests
from flask import Flask, jsonify, request, render_template

app = Flask(__name__)

# Global cache for release notes
notes_cache = {
    'data': None,
    'last_updated': 0
}
CACHE_TIMEOUT = 600  # 10 minutes cache duration

def parse_release_note_html(html_content):
    """
    Parses the BigQuery release note HTML entry and splits it into
    individual updates based on <h3> headers.
    """
    if not html_content:
        return []
    
    # Matches <h3>Update Type</h3> followed by paragraphs/lists until next <h3> or end of string
    pattern = re.compile(r'<h3>(.*?)</h3>\s*(.*?)(?=\s*<h3>|$)', re.DOTALL | re.IGNORECASE)
    matches = pattern.findall(html_content)
    
    if matches:
        updates = []
        for title, body in matches:
            body_clean = body.strip()
            updates.append({
                'type': title.strip(),
                'body': body_clean
            })
        return updates
    else:
        # Fallback if no <h3> tags are found
        return [{
            'type': 'Update',
            'body': html_content.strip()
        }]

def fetch_release_notes():
    """
    Fetches the BigQuery release notes XML feed and parses it.
    """
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    
    headers = {
        'User-Agent': 'BigQuery-Release-Notes-Viewer/1.0 (Flask Web Application)'
    }
    
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    
    feed = feedparser.parse(response.content)
    
    entries = []
    for entry in feed.entries:
        raw_html = ""
        if 'summary' in entry:
            raw_html = entry.summary
        elif 'content' in entry and len(entry.content) > 0:
            raw_html = entry.content[0].value
            
        updates = parse_release_note_html(raw_html)
        
        type_priority = {'feature': 0, 'changed': 1, 'resolved': 2, 'issue': 3, 'deprecated': 4}
        updates.sort(key=lambda u: type_priority.get(u['type'].lower(), 99))
        
        entries.append({
            'id': entry.get('id', entry.get('link', '')),
            'title': entry.get('title', 'Unknown Date'),
            'updated': entry.get('updated', ''),
            'link': entry.get('link', 'https://cloud.google.com/bigquery/docs/release-notes'),
            'updates': updates
        })
        
    return {
        'feed_title': feed.feed.get('title', 'BigQuery - Release notes'),
        'feed_link': feed.feed.get('link', 'https://cloud.google.com/bigquery/docs/release-notes'),
        'entries': entries,
        'fetched_at': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    global notes_cache
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not notes_cache['data'] or (now - notes_cache['last_updated']) > CACHE_TIMEOUT:
        try:
            data = fetch_release_notes()
            notes_cache['data'] = data
            notes_cache['last_updated'] = now
            return jsonify({
                'success': True,
                'source': 'fresh',
                'data': data
            })
        except Exception as e:
            if notes_cache['data']:
                return jsonify({
                    'success': True,
                    'source': 'cache_fallback',
                    'error': str(e),
                    'data': notes_cache['data']
                })
            return jsonify({
                'success': False,
                'error': f"Failed to fetch release notes: {str(e)}"
            }), 500
            
    return jsonify({
        'success': True,
        'source': 'cache',
        'data': notes_cache['data']
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
