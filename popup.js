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
                // Don't trigger selection if clicking on delete button
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
function addProxy(host, port, description) {
    chrome.storage.sync.get('proxies', (data) => {
        const proxies = data.proxies || [];
        
        // Check if proxy with same host and port already exists
        const existingProxy = proxies.find(p => 
            p.host === host && 
            p.port === parseInt(port)
        );
        
        if (existingProxy) {
            showStatus('Proxy with same address already exists!', 'error');
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
        
        // Check if this proxy is already active
        chrome.storage.sync.get('activeProxy', (activeData) => {
            const currentActive = activeData.activeProxy;
            const isAlreadyActive = currentActive && 
                                  currentActive.host === proxy.host && 
                                  currentActive.port === proxy.port;
            
            if (isAlreadyActive) {
                showStatus('This proxy is already active!', 'info');
                return;
            }
            
            console.log(`Switching to proxy: ${proxy.host}:${proxy.port}`);
            
            chrome.runtime.sendMessage({ 
                action: 'enable', 
                host: proxy.host, 
                port: proxy.port
            }, (response) => {
                if (chrome.runtime.lastError) {
                    showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
                } else {
                    // Save active proxy information
                    chrome.storage.sync.set({ activeProxy: proxy }, () => {
                        showStatus(`Proxy enabled: ${proxy.host}:${proxy.port}`, 'success');
                        // Reload list to update highlighting
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
        const rules = data.routingRules || {
            proxyHosts: [],
            directHosts: [],
            defaultAction: 'proxy'
        };
        document.getElementById('proxy-hosts').value = rules.proxyHosts.join('\n');
        document.getElementById('direct-hosts').value = rules.directHosts.join('\n');
        const radios = document.getElementsByName('default-action');
        for (const radio of radios) {
            radio.checked = (radio.value === rules.defaultAction);
        }
    });
}

function saveRoutingRules() {
    const proxyHosts = document.getElementById('proxy-hosts').value.split('\n').map(s => s.trim()).filter(Boolean);
    const directHosts = document.getElementById('direct-hosts').value.split('\n').map(s => s.trim()).filter(Boolean);
    const radios = document.getElementsByName('default-action');
    let defaultAction = 'proxy';
    for (const radio of radios) {
        if (radio.checked) defaultAction = radio.value;
    }
    const rules = { proxyHosts, directHosts, defaultAction };
    chrome.storage.sync.set({ routingRules: rules }, () => {
        showStatus('Routing rules saved!', 'success');
        
        // Reload PAC script if proxy is active
        chrome.storage.sync.get('activeProxy', (data) => {
            if (data.activeProxy) {
                chrome.runtime.sendMessage({ 
                    action: 'reloadPAC', 
                    host: data.activeProxy.host, 
                    port: data.activeProxy.port 
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error reloading PAC:', chrome.runtime.lastError.message);
                        showStatus('Rules saved, but failed to reload proxy settings', 'error');
                    } else {
                        showStatus('Routing rules saved and proxy settings updated!', 'success');
                    }
                });
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
    const host = document.getElementById('new-host').value;
    const port = document.getElementById('new-port').value;
    const description = document.getElementById('new-description').value;
    
    if (host && port) {
        addProxy(host, port, description);
        // Clear fields after adding
        document.getElementById('new-host').value = '127.0.0.1';
        document.getElementById('new-port').value = '1080';
        document.getElementById('new-description').value = '';
    } else {
        alert('Please enter host and port');
    }
});



// Disable button
document.getElementById('disable').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'disable' }, (response) => {
        if (chrome.runtime.lastError) {
            showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        } else {
            // Clear active proxy information
            chrome.storage.sync.remove('activeProxy', () => {
                showStatus('Status: ' + (response ? response.status : 'disabled'), 'success');
                // Reload list to update highlighting
                loadProxies();
            });
        }
    });
});

document.getElementById('save-rules').addEventListener('click', saveRoutingRules);


