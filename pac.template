
const direct_list_map = new Set(/*{{DIRECT_LIST}}*/);
const proxy_list_map = new Set(/*{{PROXY_LIST}}*/);

function FindProxyForURL(url, host) {
    
    function searchSuffix( set , str) {
        if (set.length === 0) return false;
        if (str.length === 0) return true;
    
        for (var i = -1; i > -(str.length+1); i--) {
            console.log(str.slice(i,str.length));
            if (set.has(str.slice(i,str.length))) 
                return true;
        }
        return false;
    }

    // Local addresses always DIRECT
    if (isPlainHostName(host) || 
        shExpMatch(host, "*.local") ||
        isInNet(host, "10.0.0.0", "255.0.0.0") ||
        isInNet(host, "172.16.0.0", "255.240.0.0") ||
        isInNet(host, "192.168.0.0", "255.255.0.0") ||
        isInNet(host, "127.0.0.0", "255.255.255.0")) {
        return "DIRECT";
    }
    
    if (searchSuffix(direct_list_map, host)) return "DIRECT";
    if (searchSuffix(proxy_list_map, host)) return /*{{PROXY_RETURN}}*/;
    return /*{{DEFAULT_ACTION}}*/;
}
