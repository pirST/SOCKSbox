// Function to set proxy (SOCKS5 or HTTP)
function setProxy(host, port, type, callback) {
    chrome.storage.sync.get(['routingRules'], (data) => {
        const rules = data.routingRules || { hosts: [], defaultAction: 'proxy' };
        
        // Determine PAC directive based on proxy type
        // SOCKS5 -> "SOCKS5 host:port"
        // HTTP -> "PROXY host:port" (standard PAC directive for HTTP proxy)
        const proxyType = type || 'socks5';
        const pacDirective = proxyType === 'http' ? `PROXY ${host}:${port}` : `SOCKS5 ${host}:${port}`;

        const unifiedHosts = (rules.hosts || []).filter(Boolean).map(String);
        const defaultAction = rules.defaultAction === 'direct' ? 'DIRECT' : pacDirective;

        // Build [host, directive] pairs. Empty directive => use CURRENT_PROXY in PAC.
        const hostsForPac = [];
        for (const entry of unifiedHosts) {
            if (typeof entry !== 'string' || !entry) continue;

            if (entry.includes('@')) {
                const parts = entry.split('@', 2);
                const rawHost = String(parts[0] || '').trim();
                const rawProxy = String(parts[1] || '').trim();
                if (!rawHost) continue;

                if (!rawProxy) {
                    hostsForPac.push([rawHost, ""]);
                } else {
                    let directive;
                    if (/^direct$/i.test(rawProxy)) {
                        directive = 'DIRECT';
                    } else if (/^socks5\s+/i.test(rawProxy)) {
                        const rest = rawProxy.replace(/^\s*socks5\s+/i, '').trim();
                        directive = `SOCKS5 ${rest}`;
                    } else if (/^http\s+/i.test(rawProxy)) {
                        const rest = rawProxy.replace(/^\s*http\s+/i, '').trim();
                        directive = `PROXY ${rest}`;
                    } else if (/^proxy\s+/i.test(rawProxy)) {
                        const rest = rawProxy.replace(/^\s*proxy\s+/i, '').trim();
                        directive = `PROXY ${rest}`;
                    } else {
                        // Default to SOCKS5 for backward compatibility
                        directive = `SOCKS5 ${rawProxy}`;
                    }
                    hostsForPac.push([rawHost, directive]);
                }
            } else {
                // No explicit proxy => route via current active proxy
                hostsForPac.push([entry, ""]);
            }
        }

        const pacSuffixList = JSON.stringify(hostsForPac);
        const pacCurrentProxy = JSON.stringify(pacDirective);
        const pacDefaultAction = JSON.stringify(defaultAction);

        const templateUrl = chrome.runtime.getURL('pac.template');
        fetch(templateUrl)
            .then((resp) => resp.text())
            .then((template) => {
                const pacScript = template
                    .replaceAll('/*{{SUFFIX_LIST}}*/', pacSuffixList)
                    .replaceAll('/*{{CURRENT_PROXY}}*/', pacCurrentProxy)
                    .replaceAll('/*{{DEFAULT_ACTION}}*/', pacDefaultAction);

                console.log('=== GENERATED PAC SCRIPT ===');
                console.log(pacScript);
                const config = {
                    mode: "pac_script",
                    pacScript: {
                        data: pacScript
                    }
                };
                try {
                    console.log('Setting proxy with config:', config);
                    chrome.proxy.settings.set(
                        { value: config, scope: 'regular' },
                        () => {
                            if (chrome.runtime.lastError) {
                                console.error('Proxy setting error:', chrome.runtime.lastError);
                                if (callback) callback(false, chrome.runtime.lastError.message);
                            } else {
                                console.log(`Proxy set successfully`);
                                chrome.proxy.settings.get({}, (details) => {
                                    console.log('Current proxy settings:', details);
                                    if (callback) callback(true);
                                });
                            }
                        }
                    );
                } catch (error) {
                    console.error('Error in setProxy:', error);
                    if (callback) callback(false, error.message);
                }
            })
            .catch((error) => {
                console.error('Failed to load PAC template:', error);
                if (callback) callback(false, error.message);
            });
    });
}

// Function to disable proxy
function clearProxy(callback) {
    try {
        chrome.proxy.settings.clear({ scope: 'regular' }, () => {
            if (chrome.runtime.lastError) {
                console.error('Proxy clear error:', chrome.runtime.lastError);
                if (callback) callback(false, chrome.runtime.lastError.message);
            } else {
                console.log('Proxy cleared successfully');
                if (callback) callback(true);
            }
        });
    } catch (error) {
        console.error('Error in clearProxy:', error);
        if (callback) callback(false, error.message);
    }
}

// Message listener from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.action === 'enable') {
            if (!message.host || !message.port) {
                sendResponse({ status: 'error', message: 'Host and port are required' });
                return;
            }
            setProxy(message.host, message.port, message.type || 'socks5', (success, error) => {
                if (success) {
                    sendResponse({ status: 'enabled' });
                } else {
                    sendResponse({ status: 'error', message: error || 'Error setting proxy' });
                }
            });
        } else if (message.action === 'disable') {
            clearProxy((success, error) => {
                if (success) {
                    sendResponse({ status: 'disabled' });
                } else {
                    sendResponse({ status: 'error', message: error || 'Error disabling proxy' });
                }
            });
        } else if (message.action === 'reloadPAC') {
            if (!message.host || !message.port) {
                sendResponse({ status: 'error', message: 'Host and port are required' });
                return;
            }
            setProxy(message.host, message.port, message.type || 'socks5', (success, error) => {
                if (success) {
                    sendResponse({ status: 'reloaded' });
                } else {
                    sendResponse({ status: 'error', message: error || 'Error reloading PAC' });
                }
            });
        } else {
            sendResponse({ status: 'error', message: 'Unknown action' });
        }
    } catch (error) {
        console.error('Error in message listener:', error);
        sendResponse({ status: 'error', message: error.message });
    }
    return true; // Important for asynchronous response
});
