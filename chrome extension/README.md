# LinkedIn Feed Filter Extension

A Chrome MV3 extension that filters LinkedIn feed posts to show only recruiter hiring posts, using a hybrid classification system (local heuristics + AI).

## Overview

This extension implements a **default blur behavior**: all posts are blurred by default, and only unblurred when confidently classified as recruiter hiring posts. This prevents random normal posts from slipping through.

### Core Product Rule

**We ONLY want to show recruiter hiring posts.**

We want to **HIDE**:
- Job announcements
- Offer/brag posts
- Generic "I got hired" content

## Architecture

### Hybrid Classification Pipeline

1. **Stage A: Local Heuristics** (always run first)
   - Fast keyword/phrase matching
   - Positive signals: recruiter identity, CTAs, role listings, structural signals
   - Negative signals: job announcements, acceptance/offer, brag/outcome, thank-you posts
   - Decision logic:
     - 2+ positive categories → **CONFIDENT RECRUITER-HIRING** → UNBLUR (SHOW)
     - Any negative signal → **CONFIDENT NOT RECRUITER-HIRING** → BLUR (HIDE)
     - Mixed/uncertain → **UNCERTAIN** → BLUR + Send to AI

2. **Stage B: AI Classification** (for uncertain cases)
   - Uses Chrome's built-in LanguageModel API via background service worker
   - Only escalates when local heuristic cannot confidently determine classification
   - Defaults to HIDE (keep blurred) if API unavailable or on errors

### File Structure

```
/manifest.json                 # Chrome MV3 manifest
/background/service_worker.js  # Background service worker (AI classification)
/content/content_script.js     # Content script (post detection, local heuristics, UI)
/content/styles.css            # Blur overlay styles
/README.md                     # This file
```

## Setup Instructions

### Prerequisites

- Chrome/Chromium browser (MV3 support required)
- For AI classification: Chrome with LanguageModel API access (may require origin trial token or flags)

### Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the extension directory (`Slop-Block`)

### LanguageModel API Setup (Optional)

The extension works without the LanguageModel API (defaults to blur for uncertain posts), but AI classification requires:

- **Origin Trial Token**: Add to `manifest.json` if available
- **Chrome Flags**: Enable experimental AI features (if available in your Chrome version)
- **Fallback**: If API is unavailable, uncertain posts remain blurred (safe default)

The extension gracefully handles API unavailability and will default to keeping uncertain posts blurred.

## Usage

1. Navigate to LinkedIn feed (`https://www.linkedin.com/feed/`)
2. The extension automatically processes posts as they appear
3. Posts are blurred by default with a "⚠️ Warning (Reveal)" overlay
4. Only confident recruiter hiring posts are automatically unblurred
5. Click "⚠️ Warning (Reveal)" on any post to manually reveal it
6. Once revealed, a post stays revealed for the session (won't be re-hidden)

## Performance Considerations

### Virtualization Safety

- **Overlay-based blocking**: Uses CSS overlays instead of DOM removal
- **No height collapse**: Preserves original post dimensions
- **No layout shifts**: Absolute positioning prevents scroll jank
- **DOM recycling handling**: Verifies postKey match before applying async AI results

### Selector Strategy

- **Primary**: Semantic selectors (`role="article"`, feed unit containers)
- **Secondary**: Known classnames as fallback only
- **Rationale**: LinkedIn changes CSS classnames frequently; semantic selectors are more stable

### AI Classification Queue

- **Max 1-2 inflight requests**: Prevents API overload
- **Deduplication**: Avoids duplicate classifications for the same post
- **Async safety**: Verifies postKey match before applying results (handles DOM recycling)

## Classification Taxonomy

### Strong Positive Signals (KEEP / SHOW)

These indicate **recruiter or hiring-manager authored posts** actively hiring candidates.

#### Recruiter Identity Signals
- "recruiter", "technical recruiter", "talent partner", "talent acquisition"
- "hiring manager", "staffing", "people team", "people & culture", "hr team"
- "we are hiring", "we're hiring", "we are actively hiring", "we're growing the team"

#### Call-to-Action Signals
- "apply here", "apply now", "apply below", "link to apply"
- "drop your resume", "send your resume", "dm me your resume"
- "reach out if interested", "reach out to me", "message me directly"
- "feel free to dm", "happy to chat"

#### Role Listing Signals
- "open role", "open roles", "open position", "open positions"
- "hiring for", "looking for a", "seeking a", "we're looking for"
- "join our team", "join the team"

#### Structural Signals
- Bullet-point role descriptions
- Tech stack lists (e.g., "React, Node, AWS")
- Compensation ranges
- Location + remote/hybrid mentions
- Visa sponsorship mention

**If 2 or more of the above categories are present → CONFIDENT KEEP**

### Strong Negative Signals (HIDE)

These indicate **job announcements, offer posts, or brag content** (NOT recruiter hiring posts).

#### Job Announcement / Offer Posts
- "i'm excited to announce", "i am excited to share"
- "thrilled to announce", "happy to announce", "grateful to announce", "proud to announce"

#### Acceptance / Offer Signals
- "accepted an offer", "accepted my offer", "signed an offer"
- "offer from", "joining as", "starting as", "will be joining"
- "excited to start", "next chapter"

#### Brag / Outcome Posts
- "after months of grinding", "hard work pays off"
- "dream company", "dream role", "blessed", "humbled", "manifested"
- "finally made it", "from rejection to offer", "offers from"

#### Thank-You Posts
- "thankful for the opportunity", "thanks to my mentors"
- "couldn't have done this without", "shoutout to"

**If ANY strong negative signal appears → CONFIDENT HIDE**

### Ambiguous / Uncertain Cases (SEND TO AI)

Examples:
- Third-person hiring shares ("My team is hiring, reposting for visibility")
- Vague posts without CTA ("Exciting roles opening soon")
- Founder posts that mix growth + hiring language
- Agency recruiters sharing reposts
- Company marketing posts referencing hiring indirectly
- Posts with both hiring and self-brag language

**If signals are mixed, or only 1 weak positive signal, or recruiter language without CTA → ESCALATE TO AI MODEL**

## Technical Details

### Message Passing

- Content script uses `chrome.runtime.sendMessage` with callback pattern
- Background service worker handles `availability` and `classify` actions
- Async message handling with `sendResponse` pattern

### Post ID Strategy

- **Preferred**: Post URN/permalink from DOM (e.g., `urn:li:activity:...`)
- **Fallback**: Text hash (first 200 chars) - note: can change on "See more"
- **Storage**: `currentPostKey` stored on DOM node for async result safety

### Session State

- **User Revealed Posts**: `userRevealed[postKey] = true` (persists for session)
- **Processed Posts**: Tracks which posts have been classified
- **Pending Classifications**: Tracks inflight AI requests

### Error Handling

- **API Unavailable**: Defaults to HIDE (keep blurred) - safe bias
- **Parsing Failures**: Defaults to HIDE (keep blurred) - safe bias
- **DOM Recycling**: Verifies postKey match before applying async results
- **User Reveal**: Once revealed, never re-hide during session

## Limitations

- **LinkedIn DOM Changes**: Selectors may need updates if LinkedIn significantly changes their structure
- **LanguageModel API**: Requires origin trial token or flags (may not be available in all Chrome versions)
- **Text Extraction**: Relies on LinkedIn's DOM structure for text extraction
- **Post Key Collisions**: Text hashing can collide if posts have identical first 200 chars

## Future Enhancements

- Options page for user preferences
- Persistent reveal state (across sessions)
- Custom classification rules
- Performance metrics and analytics
- Support for other social platforms

## License

[Specify your license here]

## Contributing

[Contributing guidelines if applicable]
