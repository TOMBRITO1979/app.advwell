#!/usr/bin/env python3
"""
Remove all dark mode classes from React components
Replaces dark backgrounds with white and dark text with black/gray
"""
import re
import sys
import os

def fix_dark_classes(content):
    """Remove and replace dark mode classes"""

    # Pattern 1: Remove dark: classes entirely
    content = re.sub(r'\s+dark:[^\s"\']+', '', content)

    # Pattern 2: Fix common dark patterns
    replacements = {
        # Backgrounds
        r'bg-gray-800': 'bg-white',
        r'bg-gray-900': 'bg-white',
        r'bg-neutral-800': 'bg-white',
        r'bg-neutral-900': 'bg-white',
        r'bg-gray-700': 'bg-neutral-50',
        r'bg-neutral-700': 'bg-neutral-50',

        # Text colors
        r'text-gray-100': 'text-neutral-900',
        r'text-gray-200': 'text-neutral-700',
        r'text-white(?!-)': 'text-neutral-900',  # Keep text-white for buttons
        r'text-gray-300': 'text-neutral-600',
        r'text-gray-400': 'text-neutral-500',

        # Borders
        r'border-gray-700': 'border-neutral-300',
        r'border-gray-600': 'border-neutral-300',
        r'border-neutral-700': 'border-neutral-300',
        r'border-neutral-600': 'border-neutral-300',

        # Dividers
        r'divide-gray-700': 'divide-gray-200',
        r'divide-neutral-700': 'divide-gray-200',
    }

    for pattern, replacement in replacements.items():
        content = re.sub(pattern, replacement, content)

    return content

def process_file(filepath):
    """Process a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()

        fixed = fix_dark_classes(original)

        if fixed != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

if __name__ == '__main__':
    pages_dir = 'src/pages'

    if not os.path.exists(pages_dir):
        print(f"Directory {pages_dir} not found")
        sys.exit(1)

    files_changed = 0
    for filename in os.listdir(pages_dir):
        if filename.endswith('.tsx'):
            filepath = os.path.join(pages_dir, filename)
            if process_file(filepath):
                print(f"✓ Fixed {filename}")
                files_changed += 1
            else:
                print(f"  No changes needed in {filename}")

    print(f"\n✓ Fixed {files_changed} files")
