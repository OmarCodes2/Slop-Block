# Slop Block Website

This is the landing page for Slop Block, a Chrome extension that filters LinkedIn feed posts.

## GitHub Pages Setup

To deploy this website to GitHub Pages:

1. **Push the website directory to your repository**
   ```bash
   git add website/
   git commit -m "Add landing page"
   git push
   ```

2. **Enable GitHub Pages**
   - Go to your repository settings on GitHub
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select the branch containing the website (usually `main` or `master`)
   - Select `/website` as the folder
   - Click "Save"

3. **Access your site**
   - Your site will be available at: `https://[username].github.io/[repository-name]/`
   - Or if using a custom domain, configure it in the Pages settings

## Local Development

To preview the website locally:

1. **Using Python (simple server)**
   ```bash
   cd website
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser

2. **Using Node.js (http-server)**
   ```bash
   npx http-server website -p 8000
   ```

3. **Using VS Code Live Server**
   - Install the "Live Server" extension
   - Right-click on `index.html` and select "Open with Live Server"

## File Structure

```
website/
├── index.html      # Main landing page
├── styles.css      # All styles
├── script.js       # Interactive features
└── README.md       # This file
```

## Features

- ✅ Fully static (no build process required)
- ✅ Responsive design
- ✅ Smooth animations
- ✅ GitHub Pages compatible
- ✅ Download button with dummy file download

## Customization

All styles are in `styles.css` and can be easily customized. The color scheme uses CSS variables defined at the top of the stylesheet for easy theming.
