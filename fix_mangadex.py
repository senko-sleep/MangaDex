import os
import re

path = r'c:\Users\Owner\MangaDex-2\server\scrapers\mangadex.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find the broken block - using \s* to be safe with any whitespace/newlines
pattern = r'return url;\s*\}\s*// For other sources, use proxy\s*const base = API_BASE \|\| \'\';\s*return `\$\{base\}/api/proxy/image\?url=\$\{encodeURIComponent\(url\)\}`;\s*\}'

new_content = re.sub(pattern, 'return url;\n  }', content)

if content == new_content:
    print("No change made. Checking pattern...")
    # Try an even more relaxed pattern
    pattern2 = r'proxyUrl\(url\) \{[\s\S]*?return url;\s*\}\s*// For other sources, use proxy[\s\S]*?return `\$\{base\}/api/proxy/image\?url=\$\{encodeURIComponent\(url\)\}`;\s*\}'
    new_content = re.sub(pattern2, 'proxyUrl(url) {\n    if (!url) return \'\';\n    \n    // Always use proxy if API_BASE is set (for Vercel/Render deployments)\n    const base = API_BASE || \'\';\n    if (base) {\n      return `${base}/api/proxy/image?url=${encodeURIComponent(url)}`;\n    }\n    \n    // Fallback to direct URL (only for local development without proxy)\n    return url;\n  }', content)

if content != new_content:
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(new_content)
    print("Successfully fixed syntax error.")
else:
    print("Failed to fix syntax error.")
