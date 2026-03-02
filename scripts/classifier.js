/**
 * Standalone text classifier for LinkedIn post categories.
 * Used by test_classifier.js and kept in sync with chrome extension/content/filter.js
 */

function normalizeText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[''´`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[—–]/g, "-")
    .replace(/[^\p{L}\p{N}\s#@:/\.\-']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesPhrases(text, phrases) {
  const lower = typeof text === "string" ? text.toLowerCase() : "";
  for (const phrase of phrases) {
    if (lower.includes(phrase.toLowerCase())) return true;
  }
  return false;
}

function matchesRegex(text, regexes) {
  const raw = typeof text === "string" ? text : "";
  for (const regex of regexes) {
    if (regex.test(raw)) return true;
  }
  return false;
}

// --- Hiring (employer recruiting) ---
// Principle: employer = "we/our team" filling a role; candidate = "I" seeking a role.
// Phrases/regex use generic recruiting language, not test-specific wording.
const GUARANTEED_HIRING_PHRASES = [
  "we are hiring", "we're hiring", "we are now hiring", "we're now hiring",
  "we are currently hiring", "we're currently hiring", "we are actively hiring", "we're actively hiring",
  "hiring now", "now hiring", "currently hiring", "actively hiring", "hiring immediately", "hiring urgently",
  "open role", "open roles", "roles open", "role open", "roles available", "role available",
  "open position", "open positions", "positions open", "position open", "positions available", "position available",
  "job opening", "job openings", "opening available", "openings available",
  "we're recruiting", "we are recruiting", "recruiting now", "currently recruiting", "actively recruiting",
  "recruiting for", "hiring for", "building out the team", "expanding the team",
  "growing the team", "team expansion", "scaling the team", "headcount approved", "new headcount",
  "job description", "jd in comments", "jd below", "jd attached", "role description",
  "apply now", "apply today", "apply here", "apply below", "apply above",
  "apply via", "apply through", "apply on", "apply using", "submit your application", "submit application",
  "application link", "apply link", "link to apply", "apply in comments", "apply in the comments",
  "send your resume", "send resume", "send your cv", "send cv",
  "dm me your resume", "dm me resume", "message me your resume", "send me your resume",
  "we're looking for", "we are looking for", "we're seeking", "we are seeking", "in search of",
  "we need a", "we need an", "we're adding a", "we are adding a",
  "looking to hire", "seeking to hire", "looking to recruit", "seeking to recruit",
  "referrals welcome", "referral welcome", "comment \"interested\"", "comment 'interested'",
  "recruiting alert", "hiring:", "open requisition", "open req", "careers page",
  "contract role", "contract position", "freelance role", "internship opening", "internship role",
  "we have an urgent opening", "we're hiring", "urgent opening", "message me for the jd",
  "hiring a "  // job-listing headline: "Hiring a [Role] at [Company]" (generic)
];

const GUARANTEED_HIRING_REGEX = [
  /\bwe\s*(are|'re|[\u2019']re)\s*(actively\s*)?hiring\b/i,
  /\b(now|currently|actively)\s+hiring\b/i,
  /\b(open|available)\s+(roles?|positions?|openings?)\b/i,
  /\bapply\s+(here|now|today|below|above|via|through)\b/i,
  /\b(dm|inbox|message)\s+me\s+(your\s+)?(resume|cv)\b/i,
  /\breferrals?\s+(welcome|needed)\b/i,
  /\b(my\s+team\s+is\s+opening|opening\s+\d+\s+roles?)\b/i,
  /\bhiring:\s*\w+/i,
  /\brecruiting\s+alert\b/i,
  /\b(we're|we\s+are)\s+(looking\s+for|seeking)\b/i,
  // Employer: "our team at [company]" + recruiting action (expanding / looking for a role)
  /\bour\s+team\s+at\b.*\b(expanding|looking\s+for)\b/i,
  /\bour\s+team\s+at\b.*\blooking\s+for\b.*\bto\s+join\s+us\b/i,
  // Job-listing headline: "Hiring [a] [Role] at [Company]" (standard announcement form)
  /\bhiring\s+(a\s+)?[\w\s]{2,35}\s+at\b/i,
];

// --- Job announcement (I got a new job / I'm joining) - must NOT match "passed exam" or "certification" ---
const GUARANTEED_HIRED_ANNOUNCEMENT_PHRASES = [
  "i'm excited to announce", "i am excited to announce", "excited to announce",
  "i'm thrilled to announce", "i am thrilled to announce",
  "i'm happy to announce", "i am happy to announce",
  "i've accepted", "i have accepted", "accepted an offer", "offer accepted",
  "i'm joining", "i am joining", "i'll be joining", "i will be joining",
  "joining the team", "joining the team at", "joining the team of",
  "starting a new role", "starting my new role", "starting a new position", "starting my new position",
  "starting a new job", "starting my new job",
  "beginning a new role", "beginning my new role",
  "officially starting", "officially starting at",
  "excited to start", "thrilled to start", "can't wait to start",
  "i'm starting as", "i am starting as", "i'll be starting as",
  "i'm joining as", "i am joining as", "i'll be joining as",
  "new chapter", "next chapter", "new journey", "next journey",
  "beginning my journey", "starting my journey",
  "grateful for this opportunity", "honored to", "humbled to",
  "starting my internship at", "beginning my internship at",
  "incoming intern", "incoming software engineer intern", "incoming swe intern",
  "officially started at", "update: i've", "update: i have", "day 1 energy",
  "#newrole", "#newjob", "#newposition", "#grateful", "#internship"
];

const GUARANTEED_HIRED_ANNOUNCEMENT_REGEX = [
  /\b(accepted|accepting)\s+(an\s+)?offer\b/i,
  /\b(joining|starting|beginning)\s+(a\s+)?new\s+(role|job|position)\b/i,
  /\b(i\s*(am|'m)|i\s+will|i\s*'ll)\s+be\s+(joining|starting|beginning)\s+(at|as)\b/i,
  /\b(transitioned\s+into|moved\s+into)\s+(a\s+)?\w+\s+role\s+at\b/i,
  /\b(happy|excited|thrilled|proud)\s+to\s+share\s+that\s+i('ve|’ve| have)\s+(accepted|joined|transitioned)\b/i,
  /\b(happy|excited|thrilled)\s+to\s+say\s+i('ve|’ve| have)\s+transitioned\b/i,
  /\bstarting\s+(a\s+)?new\s+position\s+as\b/i,
  /\b(incoming)\s+\w+\s+(intern|co-?op)\b/i,
  /\b(thrilled|excited|happy)\s+to\s+announce\s+i('m| am)\s+joining\b/i,
  /\bnew\s+challenges,?\s+new\s+growth\b/i,
  /\bupdate:\s*i('ve| have)\s+officially\s+started\b/i,
  /\bofficially\s+started\s+at\s+\w+\s+as\s+a\b/i,
  /\bday\s+1\s+energy\b/i,
];

// --- Certifications (passed exam, got certified) - check before job announcement for "passed" ---
const CERTIFICATIONS_PHRASES = [
  "passed the", "passed my", "got my", "got the", "earned my", "earned the",
  "certified", "certification", "pmp", "cka", "ckad", "aws certified", "azure certified",
  "cloud practitioner", "shoutout to everyone who answered my questions during prep"
];

const CERTIFICATIONS_REGEX = [
  /\bpassed\s+(the|my)\s+(\w+\s+)?(exam|certification|test)\b/i,
  /\b(pmp|cka|ckad|aws|azure)\s+(certified|certification)\b/i,
  /\bcertified\s*✅/i,
  /\bgot\s+my\s+(pmp|cka|ckad|aws)\b/i,
  /\b(\w+)\s+certification\b/i,
  /\bpassed\s+the\s+[A-Z]{2,5}\b/i,  // e.g. "passed the CKA", "passed the PMP"
  /\blate\s+nights.*(worth\s+it|feel[s]?\s+worth)\b/i,  // common in cert posts
];

// --- Hustle culture / grindset ---
const GUARANTEED_GRINDSET_PHRASES = [
  "rise and grind", "grindset", "sigma grindset", "alpha mindset",
  "while you were sleeping", "while you slept", "no days off", "no weekends",
  "work harder", "outwork everyone", "outwork the competition", "stay hard",
  "discipline equals freedom", "discipline > motivation", "motivation is temporary",
  "nobody cares work harder", "do it tired", "sleep is for the weak",
  "the grind never stops", "hustle never stops", "obsessed", "be obsessed",
  "4am", "4 am", "5am", "5 am", "4am club", "5am club",
  "cold shower", "cold showers", "lock in", "locked in", "locking in",
  "grind harder", "hustle harder", "keep grinding",
  "i don't take days off", "i dont take days off",
  "work while they sleep", "work when they sleep",
  "you have the same 24 hours", "24 hours",
  "comfort zone is expensive", "sacrifice now", "enjoy later",
  "weekends are for catching up", "if you want it bad enough", "make the time",
  "daily discipline", "discipline > motivation",
  "that's the standard", "that is the standard", "hit the gym", "hours straight",
  "early mornings", "focused deep work", "disciplined routines", "stacking small wins daily",
  "separates average from exceptional", "consistency compounds"
];

const GUARANTEED_GRINDSET_REGEX = [
  /\b(rise\s+and\s+grind|grindset)\b/i,
  /\b(no\s+days?\s+off|no\s+weekends?)\b/i,
  /\b(discipline\s*>\s*motivation|motivation\s*>\s*discipline)\b/i,
  /\b(weekends?\s+are\s+for\s+catching\s+up|if\s+you\s+want\s+it\s+bad\s+enough)\b/i,
  /\b(sacrifice\s+now|comfort\s+zone\s+is\s+expensive)\b/i,
  /\b(daily\s+discipline|rise\s+and\s+grind)\b/i,
  /\b(i\s+worked\s+\d+\s+hours\s+straight|that's\s+the\s+standard)\b/i,
  /\b(early\s+mornings|focused\s+deep\s+work|stacking\s+small\s+wins)\b/i,
];

// --- Sponsored / Ads (explicit labels only; avoid "offer" so "accepted an offer" isn't tagged) ---
// Don't use "register now" alone - event posts say "Register now" too; require "sponsored"/"promoted"/"ad" context
const ADS_SPONSORED_PHRASES = [
  "promoted", "sponsored", "learn more", "sign up", "download", "get the guide",
  "free trial", "start your free trial", "request a demo", "book a demo", "limited time",
  "paid partnership", "(sponsored)", "(promoted)", "ad:", "sponsored post", "promoted:"
];

const ADS_SPONSORED_REGEX = [
  /\b(promoted|sponsored)\s*(post)?\s*:/i,
  /\b(book|request)\s+(a\s+)?demo\b/i,
  /\b(start|claim)\s+(your\s+)?(free\s+)?trial\b/i,
  /\(sponsored\)|\(promoted\)|paid\s+partnership/i,
  /\bad\s*:\s*\w+/i,
  /\bsponsored\s*:\s*/i,
  // Only treat "register now" as ad when combined with ad context (e.g. "Sponsored ... Register now")
  /(?:sponsored|promoted|ad)\s*[^.]*register\s+now/i,
];

// --- Sales pitch (product/service pitch, lead gen) ---
const SALES_PITCH_PHRASES = [
  "book a call", "dm me", "inbox me", "message me", "calendar link", "limited spots",
  "case study", "roi", "pipeline", "my course", "my program", "cohort",
  "newsletter", "subscribe", "waitlist", "join the waitlist",
  "comment \"checklist\"", "comment 'checklist'", "comment “checklist”",
  "free checklist", "want a quick call", "quick call",
  "automate outreach", "improve inbound leads", "reduce cycle time",
  "i've got a free", "i have a free", "comment and i'll send", "comment and i will send",
  "assessment and share recommendations", "run a 15-min assessment",
  "we recently helped", "if that sounds relevant to your team", "share more details",
  "measurable improvements in reporting", "within weeks, they saw"
];

const SALES_PITCH_REGEX = [
  /\b(dm|inbox)\s+me\b/i,
  /\bbook\s+(a\s+)?call\b/i,
  /\b(waitlist|cohort|program)\b/i,
  /\bcomment\s+["']?\s*checklist\s*["']?\s+and\s+i('ll| will)\s+send\b/i,
  /\b(free\s+checklist|want\s+a\s+quick\s+call)\b/i,
  /\b(automate\s+(your\s+)?outreach|inbound\s+leads|cycle\s+time)\b/i,
  /\b(we've|we\s+have)\s+helped\s+(teams|a\s+client)\b/i,
  /\b(tighten\s+your\s+icp|qualified\s+leads)\b/i,
  /\bif\s+you\s+want\s+(similar\s+results|a\s+quick\s+call).*(let's\s+chat|chat\b)\b/i,
  /\bstreamline\s+reporting.*(let's\s+chat|similar\s+results)\b/i,
  /\bwe\s+recently\s+helped\s+a\s+mid-sized\b/i,
  /\bif\s+that\s+sounds\s+relevant\s+to\s+your\s+team\b/i,
  /\b(share\s+more\s+details|i'd\s+be\s+happy\s+to\s+share)\b/i,
];

// --- Job seeking (I'm looking for a job) ---
const JOB_SEEKING_PHRASES = [
  "open to work", "#opentowork", "looking for new opportunities", "seeking new opportunities",
  "actively looking", "any leads", "please share", "searching for my next role",
  "exploring new opportunities", "looking for my next", "open to work:",
  "laid off", "layoff", "impacted by layoffs", "my role was eliminated", "position eliminated",
  "thank you in advance for any connections", "happy to share my resume via dm",
  "send your resume or apply", "roles in", "or remote", "remote/hybrid"
];

const JOB_SEEKING_REGEX = [
  /\b(open\s+to\s+work|#opentowork)\b/i,
  /\b(laid\s+off|layoffs?)\b/i,
  /\b(role|position)\s+(was\s+)?(eliminated|impacted)\b/i,
  /\bsearching\s+for\s+my\s+next\s+role\b/i,
  /\bexploring\s+new\s+opportunities\b/i,
  /\blooking\s+for\s+(my\s+next\s+role|new\s+opportunities)\b/i,
  /\b(open\s+to\s+work|roles?\s+in\s+\w+)\s*(or\s+remote|remote\/hybrid)\b/i,
  /\bthank\s+you\s+in\s+advance\s+for\s+any\s+connections\b/i,
  /\bhappy\s+to\s+share\s+my\s+resume\s+via\s+dm\b/i,
  // Job seeker (first person): "I'm exploring" / "I'm looking" - not "our team ... looking for ... to join us"
  /\bi'?m\s+(exploring|actively\s+looking|looking\s+for)\s+(new\s+)?(opportunities|role)/i,
];

// --- Events / Webinars ---
const EVENT_WEBINAR_PHRASES = [
  "webinar", "workshop", "live session", "panel", "fireside chat", "conference", "summit",
  "register", "registration", "save your spot", "save the date", "speaker", "speaking at",
  "virtual meetup", "community webinar", "community workshop", "career fair",
  "drop a comment if you want the link", "would love to see you there",
  "demo day", "join us for", "free ama", "save your spot", "lunch & learn", "limited seats"
];

const EVENT_WEBINAR_REGEX = [
  /\b(save the date)\b/i,
  /\b(register|registration)\b/i,
  /\b(speaking at|speaker)\b/i,
  /\b(webinar|workshop|panel)\s+on\b/i,
  /\b(running|we're running)\s+a\s+(community\s+)?(webinar|workshop|meetup|demo\s+day|career\s+fair|ama)\b/i,
  /\bexcited\s+to\s+speak\s+at\s+(a|the)\b/i,
  /\breminder:\s+(our\s+)?(virtual\s+meetup|webinar)\b/i,
  /\bjoin\s+us\s+for\s+(a\s+)?(free\s+)?(ama|webinar|workshop)\b/i,
  /\bcommunity\s+(demo\s+day|career\s+fair)\b/i,
];

// --- Educational / Tips (avoid "quick reflection" alone so life musings stay uncategorized) ---
const EDUCATIONAL_TIPS_REGEX = [
  /\b(pro\s+tip|tip:)\s+/i,
  /\bquick\s+lesson\s*:/i,
  /\b(small\s+habit)\s*:/i,
  /\b\d+\s+(tips|lessons|mistakes|steps|ways)\b/i,
  /\b(step\s*by\s*step)\b/i,
  /\b(here's\s+how|how\s+to)\b/i,
  /\b(checklist|framework|template|guide|playbook)\b/i,
  /\b(when\s+debugging|when\s+you're\s+learning|if\s+you're\s+learning\s+\w+)\b/i,
  /\b(write\s+tests\s+that\s+assert|master\s+\w+\s*\+\s*\w+)\b/i,
  /\b(changelog\s+of\s+decisions|reproduce\s+the\s+issue)\b/i,
  /\bit\s+saves\s+hours\b/i,
  /\byour\s+future\s+self\s+will\s+thank\b/i,
  /\b(indexes\s+speed\s+up|unlock\s+\d+%)\b/i,
  /\bif\s+you'?re\s+learning\s+\w+\s*:/i,
  /\b(you'?re\s+learning\s+\w+|learning\s+sql)\s*:/i,
  /\bmaster\s+(\w+\s*\+\s*\w+|group\s+by)\s+and\s+you'?ll\b/i,
  /\bunlock\s+\d+%\s+of\s+(analytics\s+)?queries\b/i,
  /\b(one\s+lesson|lesson\s+i'?ve\s+learned)\s*:/i,
  /\boptimize\s+for\s+clarity\s+before\b/i,
  /\bwhether\s+you'?re\s+writing\s+code,?\s+documenting\b/i,
  /\bclear\s+structure\s+prevents\s+more\s+problems\b/i,
];

// --- Project launch (shipped, launched, built) ---
const PROJECT_LAUNCH_PHRASES = [
  "finally out", "finally live", "launch day", "shipping update", "we shipped", "we launched",
  "is now available", "now available", "here's what's new", "what's new",
  "finally launching", "we're finally launching", "months of iteration", "this version focuses heavily on"
];

const PROJECT_LAUNCH_REGEX = [
  /\b(i|we)\s+(built|shipped|launched|released)\b/i,
  /\b(v1\.0|v1|v2|beta|public beta)\s+(is\s+)?(live|out)\b/i,
  /\b(open\s*source|github)\b/i,
  /\b(try\s+the\s+demo|product\s+demo)\b/i,
  /\b(introducing|announcing)\b/i,
  /\b(finally\s+out|finally\s+live|launch\s+day!?)\b/i,
  /\b(after\s+weeks\s+of\s+building)\b/i,
  /\b(shipping\s+update|we\s+shipped\s+a\s+new\s+feature)\b/i,
  /\b(next\s+up:)\b/i,
  /\b(check\s+it\s+out\s+and\s+tell\s+me\s+what\s+you\s+think)\b/i,
  /\blaunch\s+day!?\s+\w+\s+is\s+now\s+available\b/i,
  /\bwe\s+just\s+launched\s+\w+!?\b/i,
  /\bit\s+helps\s+(teams|you).*(would\s+love\s+feedback|try\s+it)\b/i,
  /\b(after\s+months\s+of\s+iteration|we'?re\s+finally\s+launching)\b/i,
  /\bthis\s+version\s+focuses\s+heavily\s+on\s+(usability|improvements)\b/i,
];

/**
 * Classify post text into one of: hired_announcement, hiring, grindset, sponsored, sales_pitch,
 * job_seeking, events, educational, project_launch, congrats (certifications), other
 * @param {string} postText - Raw post text
 * @returns {string} - Internal category key
 */
function classifyFromText(postText) {
  if (!postText || typeof postText !== "string") return "other";
  const normalizedText = normalizeText(postText);
  const raw = postText;

  // 1) Sponsored/Ads - often has explicit labels; check early
  if (matchesPhrases(normalizedText, ADS_SPONSORED_PHRASES) || matchesRegex(raw, ADS_SPONSORED_REGEX)) {
    return "sponsored";
  }

  // 2) Certifications - "passed the X", "got my PMP" etc. Before job announcement so "happy to share I passed" -> cert
  if (matchesPhrases(normalizedText, CERTIFICATIONS_PHRASES) || matchesRegex(raw, CERTIFICATIONS_REGEX)) {
    return "congrats";
  }

  // 3) Job announcement (I got a new job) - after certs so "happy to share I passed" isn't caught
  if (matchesPhrases(normalizedText, GUARANTEED_HIRED_ANNOUNCEMENT_PHRASES) || matchesRegex(raw, GUARANTEED_HIRED_ANNOUNCEMENT_REGEX)) {
    return "hired_announcement";
  }

  // 3b) Strong hiring signals (employer recruiting) - before job_seeking/events/sales so they win
  // Strong employer signals: run hiring check first so we don't misclassify as sales (DM me) or job_seeking (looking for)
  const strongHiring =
    /^\s*(hiring\s*:|recruiting\s+alert)/i.test(raw) ||
    (/\bcareers\s+page\b/i.test(raw) && /\b(apply|send\s+(your\s+)?resume)\b/i.test(raw)) ||
    /\bwe[''\u2019]re\s+hiring\b/i.test(raw) ||
    /\bwe\s+are\s+hiring\b/i.test(raw) ||
    /\bmy\s+team\s+is\s+opening\b/i.test(raw) ||
    /\bopening\s+\d+\s+roles?\b/i.test(raw) ||
    /\bwe\s+have\s+an?\s+urgent\s+opening\b/i.test(raw) ||
    /\bour\s+team\s+at\s+\w+(\s+\w+)?\s+is\s+(actively\s+)?looking\s+for\b.*\bto\s+join\s+us\b/i ||
    // "Our team at X is expanding / looking for" (no need for "to join us")
    /\bour\s+team\s+at\b.*\b(expanding|looking\s+for)\b/i ||
    // Job-listing headline: "Hiring [a] [Role] at [Company]"
    /\bhiring\s+(a\s+)?[\w\s]{2,35}\s+at\b/i;
  if (strongHiring && (matchesPhrases(normalizedText, GUARANTEED_HIRING_PHRASES) || matchesRegex(raw, GUARANTEED_HIRING_REGEX))) {
    return "hiring";
  }

  // 4) Job seeking (before hiring so "Open to work" / "exploring opportunities" + #hiring -> job_seeking)
  if (matchesPhrases(normalizedText, JOB_SEEKING_PHRASES) || matchesRegex(raw, JOB_SEEKING_REGEX)) {
    return "job_seeking";
  }

  // 5) Grindset (before hiring so "weekends are for catching up" + #hiring -> grindset)
  if (matchesPhrases(normalizedText, GUARANTEED_GRINDSET_PHRASES) || matchesRegex(raw, GUARANTEED_GRINDSET_REGEX)) {
    return "grindset";
  }

  // 6) Project launch (before events so "We shipped"/"Launch day" + #webinar -> project_launch)
  if (matchesPhrases(normalizedText, PROJECT_LAUNCH_PHRASES) || matchesRegex(raw, PROJECT_LAUNCH_REGEX)) {
    return "project_launch";
  }

  // 7) Events
  if (matchesPhrases(normalizedText, EVENT_WEBINAR_PHRASES) || matchesRegex(raw, EVENT_WEBINAR_REGEX)) {
    return "events";
  }

  // 8) Hiring (after job_seeking/grindset/events/project_launch so hashtag #hiring doesn't override)
  if (matchesPhrases(normalizedText, GUARANTEED_HIRING_PHRASES) || matchesRegex(raw, GUARANTEED_HIRING_REGEX)) {
    return "hiring";
  }

  // 9) Sales pitch
  if (matchesPhrases(normalizedText, SALES_PITCH_PHRASES) || matchesRegex(raw, SALES_PITCH_REGEX)) {
    return "sales_pitch";
  }

  // 10) Educational
  if (matchesRegex(raw, EDUCATIONAL_TIPS_REGEX)) {
    return "educational";
  }

  return "other";
}

// Export for Node; also support require
if (typeof module !== "undefined" && module.exports) {
  module.exports = { classifyFromText, normalizeText };
}
