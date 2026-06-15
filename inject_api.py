#!/usr/bin/env python3
"""
Inyecta API_URL en index.html para GitHub Pages deploy.
Uso: python inject_api.py "https://api.url"
"""
import os
import re
import sys

def main():
    if len(sys.argv) != 2:
        print("Uso: python inject_api.py <API_URL>")
        sys.exit(1)
    
    api_url = sys.argv[1]
    index_path = "src/index.html"
    
    with open(index_path, 'r') as f:
        content = f.read()
    
    # Reemplazar placeholder por URL real
    pattern = r"window\.__API_URL__ = window\.__API_URL__ \|\| 'http://localhost:5000/api/v1';"
    replacement = f"window.__API_URL__ = '{api_url}';"
    
    new_content = re.sub(pattern, replacement, content)
    
    with open(index_path, 'w') as f:
        f.write(new_content)
    
    print(f"✅ API URL inyectada: {api_url}")

if __name__ == "__main__":
    main()