#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path

def main():
    """Process all HTML files from 1.html to 61.html"""
    
    # Check if extract_html_to_csv.py exists
    extract_script = Path("extract_html_to_csv.py")
    if not extract_script.exists():
        print("Error: extract_html_to_csv.py not found in current directory")
        sys.exit(1)
    
    # Process files 1 through 61
    for i in range(1, 62):
        html_file = f"{i}.html"
        
        # Check if HTML file exists
        if not Path(html_file).exists():
            print(f"Warning: {html_file} not found, skipping...")
            continue
        
        print(f"Processing {html_file}...")
        
        try:
            # Run the extraction script
            result = subprocess.run(
                [sys.executable, "extract_html_to_csv.py", html_file],
                capture_output=True,
                text=True,
                check=True
            )
            print(f"  ✓ {result.stdout.strip()}")
            
        except subprocess.CalledProcessError as e:
            print(f"  ✗ Error processing {html_file}: {e.stderr}")
        except Exception as e:
            print(f"  ✗ Unexpected error processing {html_file}: {e}")
    
    print("\nProcessing complete!")

if __name__ == "__main__":
    main()