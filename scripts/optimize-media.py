#!/usr/bin/env python3
"""
NO3D Tools Media Optimization Script

Optimizes images and media files in the repository for web use.
"""

import os
import sys
from pathlib import Path
from PIL import Image
import subprocess

REPO_ROOT = Path(__file__).parent.parent

def optimize_images():
    """Optimize PNG images for web use."""
    print("🖼️  Optimizing images...")
    
    # Find all PNG files
    png_files = []
    for root, dirs, files in os.walk(REPO_ROOT):
        # Skip system directories
        if any(skip in root for skip in ['schemas', 'scripts', 'templates', '.git']):
            continue
            
        for file in files:
            if file.endswith('.png') and not file.startswith('.'):
                png_files.append(Path(root) / file)
    
    print(f"Found {len(png_files)} PNG files")
    
    for png_file in png_files:
        try:
            # Open and optimize the image
            with Image.open(png_file) as img:
                # Convert to RGBA if not already
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                
                # Resize if too large (max 1024x1024)
                if img.width > 1024 or img.height > 1024:
                    img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                    print(f"  📏 Resized: {png_file.name}")
                
                # Save with optimization
                img.save(png_file, 'PNG', optimize=True)
                print(f"  ✅ Optimized: {png_file.name}")
                
        except Exception as e:
            print(f"  ❌ Error optimizing {png_file.name}: {e}")

def optimize_videos():
    """Optimize MP4 videos for web use."""
    print("\n🎥 Optimizing videos...")
    
    # Find all MP4 files
    mp4_files = []
    for root, dirs, files in os.walk(REPO_ROOT):
        # Skip system directories
        if any(skip in root for skip in ['schemas', 'scripts', 'templates', '.git']):
            continue
            
        for file in files:
            if file.endswith('.mp4') and not file.startswith('.'):
                mp4_files.append(Path(root) / file)
    
    print(f"Found {len(mp4_files)} MP4 files")
    
    for mp4_file in mp4_files:
        try:
            # Check if ffmpeg is available
            result = subprocess.run(['ffmpeg', '-version'], 
                                  capture_output=True, text=True)
            if result.returncode != 0:
                print(f"  ⚠️  ffmpeg not available, skipping video optimization")
                break
            
            # Get file size
            file_size = mp4_file.stat().st_size / (1024 * 1024)  # MB
            
            if file_size > 10:  # Only optimize if > 10MB
                print(f"  📹 Optimizing large video: {mp4_file.name} ({file_size:.1f}MB)")
                
                # Create optimized version
                output_file = mp4_file.parent / f"{mp4_file.stem}_optimized.mp4"
                
                # FFmpeg command for web optimization
                cmd = [
                    'ffmpeg', '-i', str(mp4_file),
                    '-c:v', 'libx264',
                    '-crf', '28',  # Higher CRF for smaller file size
                    '-preset', 'fast',
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    '-movflags', '+faststart',  # Web optimization
                    '-y',  # Overwrite output file
                    str(output_file)
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode == 0:
                    # Replace original with optimized version
                    mp4_file.unlink()
                    output_file.rename(mp4_file)
                    print(f"  ✅ Optimized: {mp4_file.name}")
                else:
                    print(f"  ❌ Error optimizing {mp4_file.name}: {result.stderr}")
            else:
                print(f"  ✅ Already optimized: {mp4_file.name} ({file_size:.1f}MB)")
                
        except Exception as e:
            print(f"  ❌ Error optimizing {mp4_file.name}: {e}")

def main():
    """Main function."""
    print("🚀 NO3D Tools Media Optimization")
    print("=" * 40)
    
    # Check if PIL is available
    try:
        from PIL import Image
    except ImportError:
        print("❌ PIL (Pillow) not available. Install with: pip install Pillow")
        sys.exit(1)
    
    # Optimize images
    optimize_images()
    
    # Optimize videos
    optimize_videos()
    
    print("\n✅ Media optimization complete!")

if __name__ == "__main__":
    main()
