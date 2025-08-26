function FindProxyForURL(url, host) {
    
    function hasStringStartingSortedWithOptimized(sortedPrefixes, str) {
        if (sortedPrefixes.length === 0) return false;
        if (sortedPrefixes[0] === "") return true;
    
        for (var i = 0; i < sortedPrefixes.length; i++) {
            var prefix = sortedPrefixes[i];
            if (prefix.length > str.length) break;
            if (str.startsWith(prefix)) return true;
        }
        return false;
    }

    function reverseString(str) {
        let r = '';
        for (let j = str.length - 1; j >= 0; j--) r += str[j];
        return r
    }
    
    var PROXY_LIST = /*{{PROXY_LIST}}*/;
    var DIRECT_LIST = /*{{DIRECT_LIST}}*/;

    // Local addresses always DIRECT
    if (isPlainHostName(host) || 
        shExpMatch(host, "*.local") ||
        isInNet(host, "10.0.0.0", "255.0.0.0") ||
        isInNet(host, "172.16.0.0", "255.240.0.0") ||
        isInNet(host, "192.168.0.0", "255.255.0.0") ||
        isInNet(host, "127.0.0.0", "255.255.255.0")) {
        return "DIRECT";
    }
    
    host=reverseString(host)
    if (DIRECT_LIST.length && hasStringStartingSortedWithOptimized(DIRECT_LIST, host)) return "DIRECT";
    if (PROXY_LIST.length && hasStringStartingSortedWithOptimized(PROXY_LIST, host)) return /*{{PROXY_RETURN}}*/;
    return /*{{DEFAULT_ACTION}}*/;
}
