# Slop Block

Filter your LinkedIn feed to show only recruiter hiring posts. Clean your feed from noise and focus on what matters.

## About

Slop Block is a Chrome extension that uses a hybrid classification system (local heuristics + AI) to filter LinkedIn posts. It automatically hides job announcements, grindset posts, engagement bait, and other noise while keeping genuine recruiter hiring posts visible.

## Installation

Follow these steps to install Slop Block in Chrome:

### Step 1: Download from GitHub

1. Go to the [Slop Block repository](https://github.com/OmarCodes2/Slop-Block)
2. Click the green **"Code"** button
3. Select **"Download ZIP"**

### Step 2: Extract the ZIP File

Extract the downloaded ZIP file to a location you can easily access. You should see a folder named `Slop-Block-main` (or similar).

### Step 3: Open Chrome Extensions Page

1. Open Google Chrome
2. Navigate to `chrome://extensions/` in the address bar
   - Alternatively: Go to **Menu (⋮)** → **Extensions** → **Manage Extensions**

### Step 4: Enable Developer Mode

Toggle the **"Developer mode"** switch in the top-right corner of the Extensions page.

### Step 5: Load the Extension

1. Click the **"Load unpacked"** button that appears
2. Navigate to and select the `chrome extension` folder inside the extracted `Slop-Block` directory
   - **Important**: Select the `chrome extension` folder, not the root `Slop-Block` folder

### Step 6: Start Using Slop Block

That's it! Visit your LinkedIn feed and Slop Block will automatically start filtering posts. You can customize which post categories to show/hide by clicking the extension icon in your Chrome toolbar.

## Features

- **Precision Filtering**: Hybrid classification system combines local heuristics with AI to accurately identify recruiter hiring posts
- **Lightning Fast**: Local heuristics run first for instant results. AI only kicks in for uncertain cases
- **Privacy First**: All processing happens locally. Uses Chrome's built-in LanguageModel API - no data sent to external servers
- **Customizable**: Toggle 13+ post categories on/off
- **Real-time Updates**: Automatically processes new posts as they appear
- **Performance Optimized**: No layout shifts, no scroll jank

## Project Structure

```
Slop-Block/
├── chrome extension/     # Chrome extension source code
│   ├── background/       # Background service worker
│   ├── content/          # Content scripts
│   ├── popup/            # Extension popup UI
│   └── manifest.json     # Extension manifest
└── docs/                 # Website documentation
    ├── index.html
    ├── styles.css
    └── script.js
```

## How It Works

1. **Local Heuristics**: Fast keyword and phrase matching runs first. Identifies clear signals like "we're hiring", "apply now", job announcements, and more. Instant results for obvious cases.

2. **AI Classification**: For uncertain cases, Chrome's built-in LanguageModel API provides intelligent classification. Only escalates when local heuristics can't confidently determine the category.

## License

[Specify your license here]

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Links

- [GitHub Repository](https://github.com/OmarCodes2/Slop-Block)
- [Website/Documentation](https://[your-domain].com) <!-- Update with your actual domain -->
