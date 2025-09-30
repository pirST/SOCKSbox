// Function to load and display the proxy list
function loadProxies() {
    chrome.storage.sync.get(['proxies', 'activeProxy'], (data) => {
        const proxies = data.proxies || [];
        const activeProxy = data.activeProxy || null;
        const list = document.getElementById('proxy-list');
        list.innerHTML = '';

        proxies.forEach((proxy, index) => {
            const li = document.createElement('li');

            // Check if this proxy is active
            const isActive = activeProxy && 
                           activeProxy.host === proxy.host && 
                           activeProxy.port === proxy.port;
            
            if (isActive) {
                li.classList.add('active');
            }

            // Add click handler to the entire list item
            li.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn')) {
                    return;
                }
                enableProxy(index);
            });

            // First row: address and delete button
            const proxyRow = document.createElement('div');
            proxyRow.className = 'proxy-row';

            // Proxy address
            const address = document.createElement('div');
            address.className = 'proxy-address';
            
            // Add active indicator
            if (isActive) {
                const indicator = document.createElement('span');
                indicator.className = 'active-indicator';
                address.appendChild(indicator);
            }
            
            address.appendChild(document.createTextNode(`${proxy.host}:${proxy.port}`));

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = (e) => {
                e.stopPropagation(); // Prevent triggering the li click event
                deleteProxy(index);
            };

            proxyRow.appendChild(address);
            proxyRow.appendChild(deleteBtn);

            // Second row: description
            const description = document.createElement('div');
            description.className = 'proxy-description';
            description.textContent = proxy.description || 'No description';

            li.appendChild(proxyRow);
            li.appendChild(description);
            list.appendChild(li);
        });
    });
}

// Function to add a new proxy
function addProxy(host, port, description, callback) {
    chrome.storage.sync.get('proxies', (data) => {
        const proxies = data.proxies || [];
        
        // Check if proxy with same host and port already exists
        const existingProxy = proxies.find(p => 
            p.host === host && 
            p.port === parseInt(port)
        );
        
        if (existingProxy) {
            showStatus('Proxy with same address already exists!', 'error');
            if (typeof callback === 'function') callback(false, 'exists');
            return;
        }
        
        proxies.push({ 
            host, 
            port: parseInt(port), 
            description: description || ''
        });
        chrome.storage.sync.set({ proxies }, () => {
            loadProxies();
            showStatus('Proxy added successfully!', 'success');
            // Immediately activate the newly added proxy
            try {
                const newIndex = proxies.length - 1;
                if (newIndex >= 0) {
                    enableProxy(newIndex);
                }
            } catch (e) {
                // Ignore activation failure here; enable can still be done manually
                console.error('Failed to auto-activate newly added proxy:', e);
            }
            if (typeof callback === 'function') callback(true);
        });
    });
}

// Function to delete a proxy
function deleteProxy(index) {
    chrome.storage.sync.get(['proxies', 'activeProxy'], (data) => {
        const proxies = data.proxies || [];
        const activeProxy = data.activeProxy || null;
        const proxyToDelete = proxies[index];
        
        proxies.splice(index, 1);
        
        // If active proxy is being deleted, clear its information
        const shouldClearActive = activeProxy && 
                                activeProxy.host === proxyToDelete.host && 
                                activeProxy.port === proxyToDelete.port;
        
        const updateData = { proxies };
        if (shouldClearActive) {
            updateData.activeProxy = null;
        }
        
        chrome.storage.sync.set(updateData, () => {
            // If active proxy is being deleted, disable the connection
            if (shouldClearActive) {
                chrome.runtime.sendMessage({ action: 'disable' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error disabling proxy:', chrome.runtime.lastError.message);
                        showStatus('Proxy deleted, but failed to disable connection', 'error');
                    } else {
                        showStatus('Proxy deleted and connection disabled', 'success');
                    }
                    loadProxies();
                });
            } else {
                loadProxies();
            }
        });
    });
}

// Function to display status
function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
}

// Function to enable proxy
function enableProxy(index) {
    chrome.storage.sync.get('proxies', (data) => {
        const proxies = data.proxies || [];
        const proxy = proxies[index];
        
        if (!proxy) {
            showStatus('Error: proxy not found!', 'error');
            return;
        }
        
        // Toggle: if already active, disable; else enable this one
        chrome.storage.sync.get('activeProxy', (activeData) => {
            const currentActive = activeData.activeProxy;
            const isAlreadyActive = currentActive && 
                                  currentActive.host === proxy.host && 
                                  currentActive.port === proxy.port;

            if (isAlreadyActive) {
                chrome.runtime.sendMessage({ action: 'disable' }, () => {
                    if (chrome.runtime.lastError) {
                        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
                    } else {
                        chrome.storage.sync.remove('activeProxy', () => {
                            showStatus('Proxy disabled', 'success');
                            loadProxies();
                        });
                    }
                });
                return;
            }

            console.log(`Switching to proxy: ${proxy.host}:${proxy.port}`);

            chrome.runtime.sendMessage({ 
                action: 'enable', 
                host: proxy.host, 
                port: proxy.port
            }, () => {
                if (chrome.runtime.lastError) {
                    showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
                } else {
                    chrome.storage.sync.set({ activeProxy: proxy }, () => {
                        showStatus(`Proxy enabled: ${proxy.host}:${proxy.port}`, 'success');
                        loadProxies();
                    });
                }
            });
        });
    });
}

// --- Routing Rules Logic ---
function loadRoutingRules() {
    chrome.storage.sync.get(['routingRules'], (data) => {
        const legacy = data.routingRules || {};
        // Migrate legacy proxy/direct lists into unified hosts list once
        let hosts = Array.isArray(legacy.hosts) ? legacy.hosts : [];
        if ((!hosts || hosts.length === 0) && (Array.isArray(legacy.proxyHosts) || Array.isArray(legacy.directHosts))) {
            const proxyHosts = (legacy.proxyHosts || []).filter(Boolean);
            const directHosts = (legacy.directHosts || []).filter(Boolean);
            hosts = [];
            for (const h of proxyHosts) hosts.push(String(h));
            for (const h of directHosts) hosts.push(`${String(h)}@DIRECT`);
            const updated = { hosts, defaultAction: legacy.defaultAction || 'proxy' };
            chrome.storage.sync.set({ routingRules: updated });
        }

        const rules = { hosts: hosts || [], defaultAction: legacy.defaultAction || 'proxy' };
        const textarea = document.getElementById('hosts');
        if (textarea) textarea.value = rules.hosts.join('\n');
        const radios = document.getElementsByName('default-action');
        for (const radio of radios) {
            radio.checked = (radio.value === rules.defaultAction);
        }
    });
}

function saveRoutingRules() {
    const textarea = document.getElementById('hosts');
    const rawLines = (textarea ? textarea.value : '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .filter(s => !s.startsWith('#') && !s.startsWith(';'));

    // --- Validation helpers (moved to validation.js) ---
    const { isHostLike, parseProxyAddress } = (window.Validation || {});

    const normalized = [];
    const errors = [];
    const invalidLines = [];
    const validLines = [];
    for (const line of rawLines) {
        const hasAt = line.includes('@');
        if (!hasAt) {
            if (!isHostLike(line)) {
                errors.push(`Invalid host: ${line}`);
                invalidLines.push(line);
                continue;
            }
            validLines.push(line);
            normalized.push(line);
            continue;
        }

        const [left, rightRaw = ''] = line.split('@', 2);
        const host = String(left || '').trim();
        const right = String(rightRaw || '').trim();
        if (!isHostLike(host)) {
            errors.push(`Invalid host before @: ${line}`);
            invalidLines.push(line);
            continue;
        }
        if (right.length === 0) {
            validLines.push(`${host}@`);
            normalized.push(`${host}@`);
            continue;
        }
        if (/^direct$/i.test(right)) {
            validLines.push(`${host}@DIRECT`);
            normalized.push(`${host}@DIRECT`);
            continue;
        }
        const parsed = parseProxyAddress(right);
        if (parsed.error) {
            errors.push(`${parsed.error}: ${line}`);
            invalidLines.push(line);
            continue;
        }
        validLines.push(`${host}@${parsed.value}`);
        normalized.push(`${host}@${parsed.value}`);
    }

    if (errors.length > 0) {
        if (textarea) {
            // Move invalid lines to the top, keep originals for user to fix
            const reordered = invalidLines.concat(validLines);
            textarea.value = reordered.join('\n');
            // Pale red highlight
            textarea.style.backgroundColor = '#fdecea';
            textarea.style.borderColor = '#f5c6cb';
        }
        showStatus(`Validation failed: ${errors[0]}${errors.length > 1 ? ` (and ${errors.length - 1} more)` : ''}`, 'error');
        return;
    }
    // Clear error highlight on success
    if (textarea) {
        textarea.style.backgroundColor = '';
        textarea.style.borderColor = '';
    }
    const radios = document.getElementsByName('default-action');
    let defaultAction = 'proxy';
    for (const radio of radios) {
        if (radio.checked) defaultAction = radio.value;
    }

    // Remove duplicate hosts (case-insensitive) before saving
    const uniqueHosts = [];
    const seen = new Set();
    for (const host of normalized) {
        const key = host.toLowerCase();
        if (!seen.has(key)) {
            uniqueHosts.push(host);
            seen.add(key);
        }
    }

    const rules = { hosts: uniqueHosts, defaultAction };
    chrome.storage.sync.set({ routingRules: rules }, () => {
        showStatus('Routing rules saved!', 'success');

        chrome.storage.sync.get('activeProxy', (data) => {
            if (data.activeProxy) {
                chrome.runtime.sendMessage({
                    action: 'reloadPAC',
                    host: data.activeProxy.host,
                    port: data.activeProxy.port
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error reloading PAC:', chrome.runtime.lastError.message);
                        showStatus('Rules saved, but failed to reload proxy settings', 'error');
                        loadRoutingRules();
                    } else {
                        showStatus('Routing rules saved and proxy settings updated!', 'success');
                        loadRoutingRules();
                    }
                });
            } else {
                // No active proxy, just refresh the UI list
                loadRoutingRules();
            }
        });
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Force hide form on load
    const form = document.getElementById('add-form');
    form.classList.remove('show');
    form.style.display = 'none';
    
    loadProxies();
    loadRoutingRules();
    
    // Toggle form show/hide button handler
    document.getElementById('toggle-form').addEventListener('click', () => {
        const form = document.getElementById('add-form');
        const button = document.getElementById('toggle-form');
        
        console.log('Toggle button clicked, form display:', form.style.display);
        console.log('Form has show class:', form.classList.contains('show'));
        
        if (form.classList.contains('show')) {
            form.classList.remove('show');
            button.textContent = '+ Add New Proxy';
        } else {
            form.classList.add('show');
            button.textContent = '- Hide Form';
        }
        
        console.log('After toggle, form display:', form.style.display);
        console.log('Form has show class:', form.classList.contains('show'));
    });

    // Toggle routing rules show/hide button handler
    document.getElementById('toggle-rules').addEventListener('click', () => {
        const rulesSection = document.getElementById('rules-section');
        const button = document.getElementById('toggle-rules');
        
        if (rulesSection.style.display === 'none') {
            rulesSection.style.display = 'block';
            button.textContent = '- Hide Routing Rules';
        } else {
            rulesSection.style.display = 'none';
            button.textContent = '+ Edit Routing Rules';
        }
    });
});

// Add button
document.getElementById('add').addEventListener('click', () => {
    const address = document.getElementById('new-address').value.trim();
    const description = document.getElementById('new-description').value;

    // Expect host:port, tolerate extra spaces
    const match = address.match(/^\s*([^:\s]+)\s*:\s*(\d{1,5})\s*$/);
    if (!match) {
        alert('Please enter address as host:port');
        return;
    }
    const host = match[1];
    const portNum = parseInt(match[2], 10);
    if (!(portNum >= 1 && portNum <= 65535)) {
        alert('Port must be between 1 and 65535');
        return;
    }

    addProxy(host, portNum, description, (ok) => {
        if (ok) {
            // Clear fields only when actually added
            document.getElementById('new-address').value = '';
            document.getElementById('new-description').value = '';
        }
    });
});



// Disable button
// disable button removed; toggling is handled by clicking on active item

document.getElementById('save-rules').addEventListener('click', saveRoutingRules);

// --- Import hosts from file ---

function wireFileLoader(buttonId, inputId, textareaId) {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    const textarea = document.getElementById(textareaId);
    if (!button || !input || !textarea) return;

    button.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const imported = window.Validation.parseHostLines(String(reader.result || ''));
                textarea.value = window.Validation.appendHostsToText(textarea.value, imported);
                showStatus('Domains loaded from file', 'success');
            } catch (e) {
                showStatus('Failed to load file', 'error');
            } finally {
                input.value = '';
            }
        };
        reader.onerror = () => {
            showStatus('Failed to read file', 'error');
            input.value = '';
        };
        reader.readAsText(file);
    });
}

// Wire up importer for unified hosts list
wireFileLoader('load-hosts', 'hosts-file', 'hosts');
