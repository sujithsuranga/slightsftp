# SLightSFTP Website

This is the landing page and documentation website for SLightSFTP.

## Structure

- `index.html` - Main landing page with all sections
- `styles.css` - All styling and responsive design
- `script.js` - Interactive features and animations
- `downloads/` - Folder for installation files (to be created)
- `logo.png` - Application logo (optional)

## Setup

1. **Add Installation Files**
   - Create a `downloads` folder in the same directory as `index.html`
   - Place your compiled installer in the downloads folder
   - Name it: `SLightSFTP-1.0.0-win-x64.exe`

2. **Add Logo (Optional)**
   - Place a `logo.png` file in the same directory as `index.html`
   - Recommended size: 256x256 pixels
   - Transparent background recommended

3. **Hosting**
   - Upload all files to your web hosting service
   - Or use GitHub Pages:
     - Create a repository
     - Upload website files to `docs` folder or main branch
     - Enable GitHub Pages in repository settings

## Local Testing

To test locally:

1. Simply open `index.html` in your web browser
2. All features work without a web server
3. Download links will need actual files in the `downloads` folder

## Updating Versions

When releasing a new version:

1. **Update Download Section** (`index.html` line ~144)
   - Change version number
   - Update release date
   - Update "What's New" list
   - Update download link

2. **Add to Previous Versions** (`index.html` line ~595)
   - Add new version entry
   - Move current version to previous versions list
   - Update changelog

3. **Update Changelog** (`index.html` line ~615)
   - Add new changelog entry with version number and date
   - List all new features, improvements, and bug fixes

## Features

The website includes:

- ✅ Modern, responsive design
- ✅ Feature showcase with icons
- ✅ Download section with version info
- ✅ Comprehensive user guide
- ✅ Previous versions archive
- ✅ Changelog
- ✅ Smooth scrolling navigation
- ✅ Animated elements
- ✅ Mobile-friendly layout
- ✅ Click-to-copy code snippets

## Customization

### Colors

Edit CSS variables in `styles.css`:

```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #7c3aed;
    --success-color: #10b981;
    --danger-color: #ef4444;
    /* ... */
}
```

### Content

All content can be edited directly in `index.html`:
- Hero section
- Features
- Download info
- User guide
- Versions and changelog

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)
- Mobile browsers

## License

Same license as SLightSFTP application.
