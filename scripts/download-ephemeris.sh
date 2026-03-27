#!/bin/bash
# Download Swiss Ephemeris files for natal-chart application
# Files are downloaded from Astrodienst FTP server

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EPHEMERIS_DIR="$PROJECT_ROOT/packages/web/public/ephemeris"

echo "Downloading Swiss Ephemeris files..."
echo "Project root: $PROJECT_ROOT"
echo "Ephemeris dir: $EPHEMERIS_DIR"

# Create directory if it doesn't exist
mkdir -p "$EPHEMERIS_DIR"

# Files to download (from Astrodienst FTP)
FILES=(
    "seas_18.se1"   # Asteroid ephemeris (required for Chiron)
    "sepl_18.se1"   # Planetary ephemeris (optional, for better accuracy)
)

BASE_URL="ftp://ftp.astro.com/pub/swisseph/ephe"

for FILE in "${FILES[@]}"; do
    OUTPUT_PATH="$EPHEMERIS_DIR/$FILE"
    URL="$BASE_URL/$FILE"
    
    echo ""
    echo "Downloading $FILE..."
    echo "URL: $URL"
    echo "Output: $OUTPUT_PATH"
    
    # Try wget first, then curl
    if command -v wget &> /dev/null; then
        wget -O "$OUTPUT_PATH" "$URL" || {
            echo "Warning: wget failed for $FILE"
            rm -f "$OUTPUT_PATH"
        }
    elif command -v curl &> /dev/null; then
        curl -L -o "$OUTPUT_PATH" "$URL" || {
            echo "Warning: curl failed for $FILE"
            rm -f "$OUTPUT_PATH"
        }
    else
        echo "Error: Neither wget nor curl found. Please install one of them."
        exit 1
    fi
    
    if [ -f "$OUTPUT_PATH" ]; then
        FILE_SIZE=$(stat -c%s "$OUTPUT_PATH" 2>/dev/null || stat -f%z "$OUTPUT_PATH" 2>/dev/null || echo "unknown")
        echo "Downloaded: $FILE ($FILE_SIZE bytes)"
    else
        echo "Failed to download $FILE"
    fi
done

echo ""
echo "Download complete!"
echo ""
echo "Files downloaded to: $EPHEMERIS_DIR"
echo ""
echo "Summary:"
ls -la "$EPHEMERIS_DIR/"*.se1 2>/dev/null || echo "No .se1 files found (download may have failed)"
echo ""
echo "Note: Swiss Ephemeris files are subject to licensing terms."
echo "For commercial use, ensure you have the appropriate license from Astrodienst AG."
echo "See: https://www.astro.com/swisseph/"