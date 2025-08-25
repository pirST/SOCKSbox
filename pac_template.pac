function FindProxyForURL(url, host) {
    function hasStringStartingSortedWithOptimized(sortedArray, prefix) {
        if (sortedArray.length === 0) return false;
        if (prefix === "") return true;
        var left = 0;
        var right = sortedArray.length;
        while (left < right) {
            var mid = Math.floor((left + right) / 2);
            var current = sortedArray[mid];
            if (current < prefix) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        return left < sortedArray.length && sortedArray[left].indexOf(prefix) === 0;
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

    if (DIRECT_LIST.length && hasStringStartingSortedWithOptimized(DIRECT_LIST, host)) return "DIRECT";
    if (PROXY_LIST.length && hasStringStartingSortedWithOptimized(PROXY_LIST, host)) return /*{{PROXY_RETURN}}*/;
    return /*{{DEFAULT_ACTION}}*/;
}
