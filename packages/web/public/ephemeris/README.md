# Ephemeris Files for Swiss Ephemeris

This directory should contain Swiss Ephemeris data files (.se1) for accurate planetary and asteroid calculations.

## Required Files

For basic natal chart calculations including Chiron, you need:

1. **`seas_18.se1`** - Asteroid ephemeris (1800-2100) - **Required for Chiron**
2. **`sepl_18.se1`** - Planetary ephemeris (1800-2100) - Optional but recommended for better accuracy

## How to Obtain Files

### Option 1: Download from Astrodienst (Recommended)

Swiss Ephemeris files are available from Astrodienst AG under their licensing terms:

**FTP Download:**
```bash
# Create ephemeris directory (if not exists)
mkdir -p packages/web/public/ephemeris

# Download asteroid ephemeris (required for Chiron)
wget -O packages/web/public/ephemeris/seas_18.se1 \
  ftp://ftp.astro.com/pub/swisseph/ephe/seas_18.se1

# Download planetary ephemeris (optional, for better accuracy)
wget -O packages/web/public/ephemeris/sepl_18.se1 \
  ftp://ftp.astro.com/pub/swisseph/ephe/sepl_18.se1
```

**Using curl:**
```bash
curl -o packages/web/public/ephemeris/seas_18.se1 \
  ftp://ftp.astro.com/pub/swisseph/ephe/seas_18.se1
  
curl -o packages/web/public/ephemeris/sepl_18.se1 \
  ftp://ftp.astro.com/pub/swisseph/ephe/sepl_18.se1
```

### Option 2: Use the provided download script

Run the download script from the project root:
```bash
./scripts/download-ephemeris.sh
```

### Option 3: Manual download

1. Visit: ftp://ftp.astro.com/pub/swisseph/ephe/
2. Download `seas_18.se1` and `sepl_18.se1`
3. Place them in this directory

## File Information

- **`seas_18.se1`** (asteroids): Contains ephemeris for 18 asteroids including Chiron (#2060)
- **`sepl_18.se1`** (planets): Contains high-precision planetary ephemeris
- Files cover years 1800-2100 (sufficient for most natal charts)

## Verification

After placing files in this directory, restart the development server and calculate a chart. Check the browser console for messages:

- "Ephemeris path set to: ephemeris/" - indicates path configured
- If Chiron calculates successfully, no "Chiron calculation skipped" warning
- "Planet X calculated with Swiss Ephemeris" messages indicate files are working

## Licensing Notes

Swiss Ephemeris is dual-licensed:
1. **GPL** for open source projects
2. **Commercial license** from Astrodienst AG for proprietary applications

Ensure your use complies with the appropriate license. For commercial applications, contact Astrodienst AG (swisseph@astro.ch).

## Troubleshooting

If files are not found:
1. Verify files are in `packages/web/public/ephemeris/`
2. Check file names are correct (case-sensitive)
3. Ensure the development server is restarted after adding files
4. Check browser console for file loading errors

The application will fall back to Moshier ephemeris (built-in) if Swiss Ephemeris files are not available, but Chiron requires Swiss Ephemeris files.