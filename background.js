// Function to set SOCKS5 proxy
function setProxy(host, port, callback) {
    chrome.storage.sync.get(['routingRules'], (data) => {
        const rules = data.routingRules || { proxyHosts: [], directHosts: [], defaultAction: 'proxy' };
        // Формируем PAC-скрипт
        const proxyHosts = rules.proxyHosts.map(h => h.replace(/"/g, '\"')).filter(Boolean);
        const directHosts = rules.directHosts.map(h => h.replace(/"/g, '\"')).filter(Boolean);
        const defaultAction = rules.defaultAction === 'direct' ? 'DIRECT' : `SOCKS5 ${host}:${port}`;
        // Генерируем условия для PAC
        let pacProxyBlock = '';
        if (proxyHosts.length) {
            pacProxyBlock = 'if (' + proxyHosts.map(h => `shExpMatch(host, "${h}")`).join(' || ') + `) return "SOCKS5 ${host}:${port}";`;
        }
        let pacDirectBlock = '';
        if (directHosts.length) {
            pacDirectBlock = 'if (' + directHosts.map(h => `shExpMatch(host, "${h}")`).join(' || ') + ') return "DIRECT";';
        }
        const pacScript = `
function FindProxyForURL(url, host) {
    // Local addresses always DIRECT
    if (isPlainHostName(host) || 
        shExpMatch(host, "*.local") ||
        isInNet(host, "10.0.0.0", "255.0.0.0") ||
        isInNet(host, "172.16.0.0", "255.240.0.0") ||
        isInNet(host, "192.168.0.0", "255.255.0.0") ||
        isInNet(host, "127.0.0.0", "255.255.255.0")) {
        return "DIRECT";
    }
    ${pacDirectBlock}
    ${pacProxyBlock}
    return "${defaultAction}";
}
        `;
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
            chrome.proxy.settings.clear({ scope: 'regular' }, () => {
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
            });
        } catch (error) {
            console.error('Error in setProxy:', error);
            if (callback) callback(false, error.message);
        }
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
            setProxy(message.host, message.port, (success, error) => {
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
            setProxy(message.host, message.port, (success, error) => {
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
