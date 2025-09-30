// Validation utilities extracted for reuse across popup and background scripts

function isIpV4(str) {
    const m = String(str || '').match(/^([0-9]{1,3}\.){3}[0-9]{1,3}$/);
    if (!m) return false;
    return str.split('.').every(octet => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
    });
}

function isHostLike(str) {
    const s = String(str || '');
    if (!s || /\s/.test(s) || s.includes('@') || s.includes('/')) return false;
    if (isIpV4(s)) return true;
    const withoutLeadingDot = s.replace(/^\./, '');
    if (!withoutLeadingDot) return false;
    return /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*$/.test(withoutLeadingDot);
}

function parseProxyAddress(addr) {
    const raw = String(addr || '').trim();
    if (/^socks5\s+/i.test(raw)) {
        const rest = raw.replace(/^\s*socks5\s+/i, '').trim();
        const m = rest.match(/^([^:\s]+)\s*:\s*(\d{1,5})$/);
        if (!m) return { error: 'Invalid SOCKS5 address' };
        const host = m[1];
        const port = parseInt(m[2], 10);
        if (!isHostLike(host) || !(port >= 1 && port <= 65535)) return { error: 'Invalid SOCKS5 host or port' };
        return { value: `SOCKS5 ${host}:${port}` };
    }
    const m = raw.match(/^([^:\s]+)\s*:\s*(\d{1,5})$/);
    if (!m) return { error: 'Invalid proxy address' };
    const host = m[1];
    const port = parseInt(m[2], 10);
    if (!isHostLike(host) || !(port >= 1 && port <= 65535)) return { error: 'Invalid proxy host or port' };
    return { value: `SOCKS5 ${host}:${port}` };
}

function parseHostLines(text) {
    return String(text || '')
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .filter(s => !s.startsWith('#') && !s.startsWith(';'))
        .map(s => s.replace(/^\*\./, '.'));
}

function appendHostsToText(existingText, importedList) {
    const existing = String(existingText || '').split('\n').map(s => s.trim()).filter(Boolean);
    for (const item of importedList || []) {
        existing.push(String(item));
    }
    return existing.join('\n');
}

// Expose to window for usage in inline scripts
window.Validation = {
    isIpV4,
    isHostLike,
    parseProxyAddress,
    parseHostLines,
    appendHostsToText,
};


