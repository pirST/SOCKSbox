# SOCKS5 Proxy Manager Chrome Extension

A Chrome extension for managing SOCKS5 proxy connections with an intuitive user interface.

## Features
-  **Simple Proxy Management**: Add, remove, and switch between multiple SOCKS5 proxy servers
-  **Active Proxy Indicator**: Clearly see which proxy is currently active
-  **Persistent Storage**: Proxy configurations are saved and persist between browser sessions
-  **Connection Management**: When you delete an active proxy, the connection is automatically disabled
-  **Traffic Routing**: Configure which hosts go through proxy and which go direct, including *site.net match patterns
-  **Default Actions**: Set default behavior for traffic not matching specific rules

## Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your Chrome toolbar

## Technical Details
-  **Browser Compatibility**: Chrome and Chromium-based browsers
-  **Proxy Types**: Supports SOCKS5 proxies
-  **Local Network**: Automatically bypasses proxy for local network addresses (127.0.0.1, 192.168.x.x, 10.x.x.x, etc.)
-  **PAC Scripts**: Uses Proxy Auto-Configuration scripts for intelligent traffic routing

## Security
- Proxy configurations are stored locally in Chrome's sync storage
- No external servers are contacted for proxy management
- All proxy operations are handled through Chrome's built-in proxy API

## License
This project is open source and available under the MIT License.