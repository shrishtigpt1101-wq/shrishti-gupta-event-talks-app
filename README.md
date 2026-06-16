# BigQuery Release Notes Web App

A simple web application built with Python Flask, HTML, CSS, and JavaScript that fetches and displays the latest BigQuery Release Notes from Google's official release notes feed.

## Features

* Fetches the latest BigQuery release notes from Google's XML feed.
* Displays release notes in a clean and easy-to-read interface.
* Refresh button to load the latest updates on demand.
* Loading spinner while data is being fetched.
* Select any release note and generate a tweet about it.
* Responsive design using plain HTML, CSS, and JavaScript.

## Data Source

This application uses the official Google Cloud BigQuery Release Notes feed:

https://docs.cloud.google.com/feeds/bigquery-release-notes.xml

## Tech Stack

* Python 3
* Flask
* HTML5
* CSS3
* Vanilla JavaScript

## Installation

Clone the repository:

```bash
git clone https://github.com/shrishtigpt1101-wq/shrishti-gupta-event-talks-app.git
cd shrishti-gupta-event-talks-app
```

Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Running the Application

Start the Flask server:

```bash
python app.py
```

Open your browser and navigate to:

```text
http://127.0.0.1:5000
```

## Project Structure

```text
├── app.py
├── requirements.txt
├── README.md
├── static/
│   ├── styles.css
│   └── script.js
└── templates/
    └── index.html
```

## Future Improvements

* Search and filtering support
* Category-based release note filtering
* Dark mode
* Export updates to PDF
* AI-generated summaries of release notes

## Author

Shrishti Gupta

Built as part of learning and experimenting with Antigravity CLI and Flask web development.
