#!/usr/bin/env python3
"""
Safely fix button colors and add responsive text
- Changes text-neutral-900 to text-white in primary buttons
- Ensures proper button classes
"""
import re
import os
import sys

def fix_primary_button_text(content):
    """Fix text color in primary/colored buttons"""

    # Pattern 1: bg-primary-600 with text-neutral-900 → text-white
    content = re.sub(
        r'(className="[^"]*bg-primary-600[^"]*)\btext-neutral-900\b',
        r'\1text-white',
        content
    )

    # Pattern 2: bg-blue-600 with text-neutral-900 → text-white
    content = re.sub(
        r'(className="[^"]*bg-blue-600[^"]*)\btext-neutral-900\b',
        r'\1text-white',
        content
    )

    # Pattern 3: bg-red-600 with text-neutral-900 → text-white
    content = re.sub(
        r'(className="[^"]*bg-red-600[^"]*)\btext-neutral-900\b',
        r'\1text-white',
        content
    )

    # Pattern 4: bg-green-600 with text-neutral-900 → text-white
    content = re.sub(
        r'(className="[^"]*bg-green-600[^"]*)\btext-neutral-900\b',
        r'\1text-white',
        content
    )

    return content

def add_min_height_to_buttons(content):
    """Add min-h-[44px] to buttons that have bg or border but missing min-h"""

    lines = content.split('\n')
    result = []

    for line in lines:
        # Check if line has className with bg- or border and button-like classes
        if 'className="' in line and ('bg-' in line or 'border border-' in line):
            if 'px-' in line and 'py-' in line and 'min-h-' not in line:
                # Add min-h-[44px] before closing quote
                line = line.replace('duration-200"', 'duration-200 min-h-[44px]"')
                if 'min-h-' not in line:  # If duration-200 wasn't there
                    line = line.replace('transition-colors"', 'transition-colors min-h-[44px]"')
                if 'min-h-' not in line:  # If neither pattern matched
                    line = re.sub(r'className="([^"]*)"', r'className="\1 min-h-[44px]"', line)
        result.append(line)

    return '\n'.join(result)

def ensure_space_x_to_gap(content):
    """Replace space-x- with gap-  for flex containers"""
    content = re.sub(r'\bspace-x-(\d+)\b', r'gap-\1', content)
    return content

def process_file(filepath):
    """Process a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()

        fixed = original
        fixed = fix_primary_button_text(fixed)
        fixed = add_min_height_to_buttons(fixed)
        fixed = ensure_space_x_to_gap(fixed)

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
