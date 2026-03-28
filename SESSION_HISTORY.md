# Session History

*This file tracks completed work across development sessions. Items are moved here from PLAN.md and BUGS.md when marked as completed or resolved.*

## Session 2026-03-28: Timezone Automation & UI Enhancement

### ✅ Features Completed
1. **Automatic timezone detection** - Removed manual timezone selector, auto-detect from geocoding
2. **Luxon integration** - Added Luxon for historical DST accuracy (pre-1970 dates)
3. **Tabbed chart view** - Implemented Chart Wheel, Planet Positions, and Aspects tabs
4. **Chart wheel optimization** - Doubled size to 800px, reduced white space
5. **Retrograde indicators** - Added "R" column to planet positions table
6. **Form UI reorganization** - Moved city search to top, streamlined layout
7. **UTC calculation display** - Added subtle UTC note at bottom of form
8. **GitHub Pages SPA routing** - Added 404.html for HashRouter support

### ✅ Bugs Fixed
1. **Timezone conversion edge cases** - Fixed historical DST handling for UK 1968-1971
2. **Geocoding error handling** - Improved fallback to mock data when API unavailable

### 🔄 Deployment
- GitHub Actions workflow configured for auto-deployment
- Two successful deployments completed
- 404.html added for SPA routing support

### 📝 Notes
- Cloudflare Worker updated to return timezone data but not yet deployed
- Real geocoding requires OpenCage API key in production
- Chiron calculations require asteroid ephemeris files

---

*Add new sessions below with date headers. Move completed items from PLAN.md and resolved items from BUGS.md to appropriate sections above.*