#!/usr/bin/env python3
import re
import sys

def remove_dark_classes(content):
    """Remove dark: classes from className attributes safely"""
    # Pattern to match className="..." or className='...'
    def replace_class(match):
        full_match = match.group(0)
        quote = match.group(1)  # Either " or '
        classes = match.group(2)

        # Remove all dark:xxx classes
        cleaned = re.sub(r'\s*dark:[^\s"\']+', '', classes)
        # Clean up extra spaces
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()

        return f'className={quote}{cleaned}{quote}'

    # Match className with either single or double quotes
    pattern = r'className=(["\'`])((?:[^"\'`]|(?:\\")|(?:\\\'))*?)\1'
    result = re.sub(pattern, replace_class, content)

    return result

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: remove-dark-mode.py <file>")
        sys.exit(1)

    filepath = sys.argv[1]

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    cleaned = remove_dark_classes(content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(cleaned)

    print(f"✓ Cleaned {filepath}")
