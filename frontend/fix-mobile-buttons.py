#!/usr/bin/env python3
"""
Fix mobile buttons across all pages
- Standardize button sizes (min-h-[44px])
- Apply correct colors per function
- Fix text colors (white for colored buttons)
- Add responsive text when appropriate
"""
import re
import os
import sys

def fix_button_classes(content):
    """Fix button classes to meet mobile standards"""

    # Fix primary buttons (bg-primary-600) with wrong text color
    content = re.sub(
        r'(bg-primary-600[^"]*)(text-neutral-900)',
        r'\1text-white',
        content
    )

    # Add min-h-[44px] to buttons that don't have it
    # Pattern: button elements that have bg- or border classes but no min-h
    def add_min_height(match):
        classes = match.group(1)
        if 'min-h-' not in classes:
            # Add min-h-[44px] before the closing quote
            return match.group(0).replace(classes, classes + ' min-h-[44px]')
        return match.group(0)

    # Find button className attributes
    content = re.sub(
        r'className="([^"]*(?:bg-(?:primary|blue|red|green|white)|border border-neutral)[^"]*)"',
        add_min_height,
        content
    )

    # Fix specific button patterns

    # 1. Cancelar buttons - ensure proper neutral styling
    content = re.sub(
        r'className="([^"]*px-\d+[^"]*border[^"]*)">\s*Cancelar',
        lambda m: f'className="{ensure_cancel_classes(m.group(1))}">\n                Cancelar',
        content
    )

    # 2. Salvar/Atualizar buttons - ensure primary styling with white text
    content = re.sub(
        r'className="([^"]*bg-primary-600[^"]*)">\s*\{editMode.*?Atualizar.*?Salvar',
        lambda m: f'className="{ensure_save_classes(m.group(1))}">\n                {{editMode ? \'Atualizar\' : \'Salvar\'',
        content
    )

    # 3. Fechar buttons - ensure proper styling
    content = re.sub(
        r'className="([^"]*)">\s*Fechar\s*</button>',
        lambda m: f'className="{ensure_close_classes(m.group(1))}">\n                Fechar\n              </button>',
        content
    )

    return content

def ensure_cancel_classes(classes):
    """Ensure cancel button has correct classes"""
    base = "inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
    return base

def ensure_save_classes(classes):
    """Ensure save/submit button has correct classes"""
    base = "inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
    return base

def ensure_close_classes(classes):
    """Ensure close button has correct classes"""
    # Check if it's a primary button (green) or neutral button
    if 'bg-primary-600' in classes:
        return "inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
    else:
        return "inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"

def process_file(filepath):
    """Process a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()

        fixed = fix_button_classes(original)

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
