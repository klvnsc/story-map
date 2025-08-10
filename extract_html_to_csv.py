#!/usr/bin/env python3
import re
import csv
import sys
from pathlib import Path

def extract_data_from_html(html_file):
    """Extract media data from HTML file and return list of dictionaries"""
    
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all media items by looking for "added about" patterns which appear in each item
    # Split by this pattern to get individual media blocks
    time_pattern = r'added about ([^<]*)'
    time_matches = list(re.finditer(time_pattern, content))
    
    data = []
    
    # Process each media item by examining the content around each "added about" match
    for i, time_match in enumerate(time_matches):
        time_added = time_match.group(1).strip()
        
        # Get the content block around this time match (look backwards to find the media)
        start_pos = max(0, time_match.start() - 3000)  # Look back 3000 chars
        end_pos = min(len(content), time_match.end() + 1000)  # Look ahead 1000 chars
        block = content[start_pos:end_pos]
        
        # Check if this is a video (has video source) or image (has jpg href)
        video_match = re.search(r'<source src="([^"]*\.mp4[^"]*)"', block)
        image_match = re.search(r'href="(https://scontent[^"]*\.jpg[^"]*)"', block)
        
        if video_match:
            # It's a video
            media_type = 'video'
            cdn_url = video_match.group(1)
            
            # Extract duration for videos
            duration_match = re.search(r'duration: (\d+) second', block)
            duration = int(duration_match.group(1)) if duration_match else 0
            
        elif image_match:
            # It's an image
            media_type = 'image'
            cdn_url = image_match.group(1)
            duration = 0  # Images don't have duration
            
        else:
            # Skip if we can't find either video or image
            continue
        
        item = {
            'id': i + 1,
            'media_type': media_type,
            'cdn_url': cdn_url,
            'duration': duration,
            'time_added': time_added
        }
        data.append(item)
    
    return data

def main():
    if len(sys.argv) != 2:
        print("Usage: python extract_html_to_csv.py <input_file.html>")
        sys.exit(1)
    
    input_file = Path(sys.argv[1])
    
    if not input_file.exists():
        print(f"Error: File {input_file} does not exist")
        sys.exit(1)
    
    # Create output CSV filename
    output_file = input_file.with_suffix('.csv')
    
    # Extract data
    data = extract_data_from_html(input_file)
    
    # Write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['id', 'media_type', 'cdn_url', 'duration', 'time_added']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        writer.writerows(data)
    
    print(f"Extracted {len(data)} items from {input_file} to {output_file}")

if __name__ == "__main__":
    main()