// State Management
let allReleaseNotes = null;
let filteredNotes = [];
let currentFilter = 'all';
let searchQuery = '';
let activeUpdateForTweet = null; // Holds the currently selected update data for composition

// DOM Elements
const themeToggle = document.getElementById('theme-toggle');
const refreshBtn = document.getElementById('refresh-btn');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const loadingContainer = document.getElementById('loading-container');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const notesContainer = document.getElementById('notes-container');

// Stats Elements
const statTotalNotes = document.getElementById('stat-total-notes');
const statFeatures = document.getElementById('stat-features');
const statChanges = document.getElementById('stat-changes');
const statIssues = document.getElementById('stat-issues');

// Selection Tooltip Elements
const selectionTooltip = document.getElementById('selection-tooltip');
const selectionTweetBtn = document.getElementById('selection-tweet-btn');

// Slide-over Panel Elements
const tweetPanelOverlay = document.getElementById('tweet-panel-overlay');
const tweetPanel = document.getElementById('tweet-panel');
const panelCloseBtn = document.getElementById('panel-close-btn');
const panelUpdatePreview = document.getElementById('panel-update-preview');
const templatePills = document.querySelectorAll('.template-pill');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const sendTweetBtn = document.getElementById('send-tweet-btn');

/* ==========================================================================
   1. Theme Management (Dark / Light Mode)
   ========================================================================== */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme ? savedTheme : (systemPrefersDark ? 'dark' : 'dark'); // Default to dark
    document.documentElement.setAttribute('data-theme', initialTheme);
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

/* ==========================================================================
   2. Fetch Data from API
   ========================================================================== */
async function fetchNotes(forceRefresh = false) {
    showLoading();
    hideError();
    hideNotes();
    
    refreshBtn.classList.add('refreshing');
    
    try {
        const url = `/api/notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            allReleaseNotes = result.data.entries;
            processAndRender();
        } else {
            showError(result.error || 'Failed to fetch release notes from the server.');
        }
    } catch (error) {
        showError('Network error occurred. Please make sure the Flask server is running.');
        console.error(error);
    } finally {
        refreshBtn.classList.remove('refreshing');
    }
}

function showLoading() {
    loadingContainer.classList.remove('hidden');
}

function hideLoading() {
    loadingContainer.classList.add('hidden');
}

function showError(msg) {
    hideLoading();
    errorMessage.textContent = msg;
    errorContainer.classList.remove('hidden');
}

function hideError() {
    errorContainer.classList.add('hidden');
}

function hideNotes() {
    notesContainer.classList.add('hidden');
}

/* ==========================================================================
   3. Data Processing, Stats, & Rendering
   ========================================================================== */
function processAndRender() {
    hideLoading();
    
    if (!allReleaseNotes || allReleaseNotes.length === 0) {
        showError('No release notes found in the feed.');
        return;
    }
    
    // Calculate statistics based on raw, unfiltered feed
    calculateStats(allReleaseNotes);
    
    // Apply filters & search
    filterAndSearchNotes();
    
    // Render the processed list
    renderNotes();
    notesContainer.classList.remove('hidden');
}

function calculateStats(notes) {
    let totalDays = notes.length;
    let featureCount = 0;
    let changeCount = 0;
    let issueCount = 0;
    
    notes.forEach(entry => {
        entry.updates.forEach(upd => {
            const type = upd.type.toLowerCase();
            if (type.includes('feature')) {
                featureCount++;
            } else if (type.includes('change') || type.includes('resolved')) {
                changeCount++;
            } else if (type.includes('issue') || type.includes('deprecat') || type.includes('bug')) {
                issueCount++;
            }
        });
    });
    
    statTotalNotes.textContent = totalDays;
    statFeatures.textContent = featureCount;
    statChanges.textContent = changeCount;
    statIssues.textContent = issueCount;
}

function filterAndSearchNotes() {
    filteredNotes = [];
    
    allReleaseNotes.forEach(entry => {
        // Filter updates in this entry
        const matchedUpdates = entry.updates.filter(upd => {
            // 1. Check Category Filter
            const typeLower = upd.type.toLowerCase();
            let matchesCategory = false;
            
            if (currentFilter === 'all') {
                matchesCategory = true;
            } else if (currentFilter === 'feature' && typeLower.includes('feature')) {
                matchesCategory = true;
            } else if (currentFilter === 'changed' && (typeLower.includes('change') || typeLower.includes('resolve'))) {
                matchesCategory = true;
            } else if (currentFilter === 'issue' && (typeLower.includes('issue') || typeLower.includes('deprecat') || typeLower.includes('bug'))) {
                matchesCategory = true;
            }
            
            if (!matchesCategory) return false;
            
            // 2. Check Search Query
            if (searchQuery.trim() === '') return true;
            
            const q = searchQuery.toLowerCase();
            const bodyText = getPlainText(upd.body).toLowerCase();
            const dateText = entry.title.toLowerCase();
            const typeText = upd.type.toLowerCase();
            
            return bodyText.includes(q) || dateText.includes(q) || typeText.includes(q);
        });
        
        // If entry contains matching updates, clone entry with filtered updates
        if (matchedUpdates.length > 0) {
            filteredNotes.push({
                ...entry,
                updates: matchedUpdates
            });
        }
    });
}

function renderNotes() {
    notesContainer.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        notesContainer.innerHTML = `
            <div class="error-container">
                <h3>No release notes match your criteria</h3>
                <p>Try clearing your search query or choosing a different filter category.</p>
            </div>
        `;
        return;
    }
    
    filteredNotes.forEach(entry => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        // Date Header
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        
        const dateTitle = document.createElement('h2');
        dateTitle.className = 'date-title';
        dateTitle.textContent = entry.title;
        
        const dateDivider = document.createElement('div');
        dateDivider.className = 'date-divider';
        
        const dateAnchor = document.createElement('a');
        dateAnchor.className = 'date-anchor';
        dateAnchor.href = entry.link;
        dateAnchor.target = '_blank';
        dateAnchor.rel = 'noopener';
        dateAnchor.textContent = 'View on Google Docs';
        
        dateHeader.appendChild(dateTitle);
        dateHeader.appendChild(dateDivider);
        dateHeader.appendChild(dateAnchor);
        dateGroup.appendChild(dateHeader);
        
        // Updates List for this Date
        const updatesList = document.createElement('div');
        updatesList.className = 'updates-list';
        
        entry.updates.forEach(upd => {
            const card = document.createElement('div');
            const typeClass = getCardTypeClass(upd.type);
            card.className = `update-card ${typeClass}`;
            
            // Card Header
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            
            const badge = document.createElement('span');
            badge.className = 'tag-badge';
            badge.textContent = upd.type;
            
            const actions = document.createElement('div');
            actions.className = 'card-actions';
            
            const tweetBtn = document.createElement('button');
            tweetBtn.className = 'btn-tweet-action';
            tweetBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>Tweet</span>
            `;
            
            // Hook up card Tweet click event
            tweetBtn.addEventListener('click', () => {
                openTweetComposer(entry.title, upd.type, upd.body, entry.link);
            });
            
            actions.appendChild(tweetBtn);
            cardHeader.appendChild(badge);
            cardHeader.appendChild(actions);
            
            // Card Body (containing parsed feed HTML)
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            cardBody.innerHTML = upd.body;
            
            card.appendChild(cardHeader);
            card.appendChild(cardBody);
            updatesList.appendChild(card);
        });
        
        dateGroup.appendChild(updatesList);
        notesContainer.appendChild(dateGroup);
    });
}

function getCardTypeClass(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'feature';
    if (t.includes('change') || t.includes('resolve')) return 'changed';
    if (t.includes('issue') || t.includes('deprecat') || t.includes('bug')) return 'issue';
    return 'announcement';
}

function getPlainText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

/* ==========================================================================
   4. Text Selection & Floating Tooltip
   ========================================================================== */
document.addEventListener('selectionchange', handleTextSelection);
document.addEventListener('mouseup', handleTextSelection);

function handleTextSelection(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Ignore selection if inside the Tweet panel itself to allow editing
    if (tweetPanel.contains(e.target) || tweetPanelOverlay.contains(e.target)) {
        return;
    }
    
    if (selectedText.length < 5) {
        selectionTooltip.classList.remove('show');
        setTimeout(() => {
            if (!selectionTooltip.classList.contains('show')) {
                selectionTooltip.classList.add('hidden');
            }
        }, 150);
        return;
    }
    
    try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        if (rect.width === 0 && rect.height === 0) {
            return;
        }
        
        // Position tooltip centered above the selected text
        const tooltipWidth = 140; // Approx width
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        let top = rect.top + scrollY - 45;
        let left = rect.left + scrollX + (rect.width / 2) - (tooltipWidth / 2);
        
        // Prevent tooltip from going offscreen
        if (top < scrollY) {
            top = rect.bottom + scrollY + 10; // place below text instead
        }
        if (left < 10) {
            left = 10;
        } else if (left + tooltipWidth > window.innerWidth - 10) {
            left = window.innerWidth - tooltipWidth - 10;
        }
        
        selectionTooltip.style.top = `${top}px`;
        selectionTooltip.style.left = `${left}px`;
        
        selectionTooltip.classList.remove('hidden');
        // Small timeout to allow css opacity transition
        setTimeout(() => {
            selectionTooltip.classList.add('show');
        }, 10);
    } catch (err) {
        console.error("Failed to position selection tooltip", err);
    }
}

// Click floating selection tweet button
selectionTweetBtn.addEventListener('click', () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText) {
        // Try to identify which card contains the selection to grab metadata
        let type = 'Update';
        let date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        let link = 'https://cloud.google.com/bigquery/docs/release-notes';
        
        const range = selection.getRangeAt(0);
        const cardNode = findAncestor(range.commonAncestorContainer, 'update-card');
        
        if (cardNode) {
            // Find type badge
            const badge = cardNode.querySelector('.tag-badge');
            if (badge) type = badge.textContent;
            
            // Find date header (parent of the list container containing card)
            const groupNode = findAncestor(cardNode, 'date-group');
            if (groupNode) {
                const dateHeader = groupNode.querySelector('.date-title');
                if (dateHeader) date = dateHeader.textContent;
                
                const linkAnchor = groupNode.querySelector('.date-anchor');
                if (linkAnchor) link = linkAnchor.href;
            }
        }
        
        // Wrap selection in html string as preview
        const bodyPreview = `"...${selectedText}..."`;
        openTweetComposer(date, type, bodyPreview, link, selectedText);
    }
    
    // Clear selection
    window.getSelection().removeAllRanges();
    selectionTooltip.classList.remove('show');
    selectionTooltip.classList.add('hidden');
});

function findAncestor(el, cls) {
    while ((el = el.parentElement) && !el.classList.contains(cls));
    return el;
}

/* ==========================================================================
   5. Tweet Composer slide-over panel
   ========================================================================== */
function openTweetComposer(date, type, bodyHtml, link, customSnippet = null) {
    activeUpdateForTweet = {
        date,
        type,
        bodyHtml,
        link,
        customSnippet
    };
    
    // Prefill preview card
    panelUpdatePreview.innerHTML = bodyHtml;
    
    // Reset templates selector
    templatePills.forEach(pill => pill.classList.remove('active'));
    // Default to the first style "hype"
    const defaultPill = document.querySelector('.template-pill[data-style="hype"]');
    if (defaultPill) defaultPill.classList.add('active');
    
    // Generate text
    generateTweetContent('hype');
    
    // Show Panel
    tweetPanelOverlay.classList.remove('hidden');
    // Allow overlay display block first before transitions
    setTimeout(() => {
        tweetPanelOverlay.classList.add('show');
    }, 10);
}

function closeTweetComposer() {
    tweetPanelOverlay.classList.remove('show');
    setTimeout(() => {
        tweetPanelOverlay.classList.add('hidden');
    }, 300); // Wait for transition
}

panelCloseBtn.addEventListener('click', closeTweetComposer);
tweetPanelOverlay.addEventListener('click', (e) => {
    if (e.target === tweetPanelOverlay) {
        closeTweetComposer();
    }
});

// Template switching listeners
templatePills.forEach(pill => {
    pill.addEventListener('click', () => {
        templatePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const style = pill.getAttribute('data-style');
        generateTweetContent(style);
    });
});

function generateTweetContent(style) {
    if (!activeUpdateForTweet) return;
    
    const { date, type, bodyHtml, link, customSnippet } = activeUpdateForTweet;
    
    // Grab text content: use customSnippet if available, otherwise strip html of update body
    let rawText = customSnippet ? customSnippet : getPlainText(bodyHtml);
    
    // Clean up spaces/newlines
    rawText = rawText.replace(/\s+/g, ' ').trim();
    
    let draft = '';
    
    if (style === 'hype') {
        // Calculate room for content
        const prefix = `🚀 New BigQuery update! (${type})\n\n"`;
        const suffix = `"\n\n🔗 ${link} #BigQuery #GoogleCloud`;
        const allowedLen = 280 - prefix.length - suffix.length;
        
        let snippet = rawText;
        if (snippet.length > allowedLen) {
            snippet = snippet.substring(0, allowedLen - 3) + '...';
        }
        draft = `${prefix}${snippet}${suffix}`;
        
    } else if (style === 'info') {
        const prefix = `📊 BigQuery Release Note (${date}) - ${type}:\n\n`;
        const suffix = `\n\nRead more at:\n${link}`;
        const allowedLen = 280 - prefix.length - suffix.length;
        
        let snippet = rawText;
        if (snippet.length > allowedLen) {
            snippet = snippet.substring(0, allowedLen - 3) + '...';
        }
        draft = `${prefix}${snippet}${suffix}`;
        
    } else if (style === 'short') {
        const prefix = `⚡ BigQuery (${type}): `;
        const suffix = ` ${link}`;
        const allowedLen = 280 - prefix.length - suffix.length;
        
        let snippet = rawText;
        if (snippet.length > allowedLen) {
            snippet = snippet.substring(0, allowedLen - 3) + '...';
        }
        draft = `${prefix}${snippet}${suffix}`;
    }
    
    tweetTextarea.value = draft;
    updateCharCounter();
}

// Handle character count updates
tweetTextarea.addEventListener('input', updateCharCounter);

function updateCharCounter() {
    const len = tweetTextarea.value.length;
    charCounter.textContent = `${len} / 280`;
    
    // Alert styles based on character length
    charCounter.classList.remove('warning', 'danger');
    sendTweetBtn.disabled = false;
    
    if (len > 280) {
        charCounter.classList.add('danger');
        sendTweetBtn.disabled = true;
    } else if (len > 250) {
        charCounter.classList.add('warning');
    }
}

// Open web intent on Twitter click
sendTweetBtn.addEventListener('click', () => {
    const text = tweetTextarea.value;
    if (text.length > 280) return;
    
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank');
    closeTweetComposer();
});

/* ==========================================================================
   6. Controls (Search & Filter Pills & Refresh)
   ========================================================================== */
// Search input key events
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    filterAndSearchNotes();
    renderNotes();
});

// Category pills selection
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        filterAndSearchNotes();
        renderNotes();
    });
});

// Refresh button trigger
refreshBtn.addEventListener('click', () => {
    fetchNotes(true); // pass true to bypass python server cache
});

// Retry on error button trigger
retryBtn.addEventListener('click', () => {
    fetchNotes(false);
});

/* ==========================================================================
   7. Application Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchNotes();
});
