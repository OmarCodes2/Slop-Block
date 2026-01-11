window.LinkedInFilter = window.LinkedInFilter || {};
const GUARANTEED_HIRING_PHRASES = [
  "we are hiring","we're hiring","we are now hiring","we're now hiring",
  "we are currently hiring","we're currently hiring","we are actively hiring","we're actively hiring",
  "hiring now","now hiring","currently hiring","actively hiring","hiring immediately","hiring urgently",
  "immediate hire","urgent hiring","hiring asap","asap hire","fast hire",
  "open role","open roles","roles open","role open","roles available","role available",
  "open position","open positions","positions open","position open","positions available","position available",
  "job opening","job openings","opening available","openings available",
  "vacancy","vacancies","open vacancy","open vacancies",
  "we're recruiting","we are recruiting","recruiting now","currently recruiting","actively recruiting",
  "recruiting for","hiring for","staffing for","building out the team","expanding the team",
  "growing the team","team expansion","scaling the team","headcount approved","new headcount",
  "job description","jd in comments","jd below","jd attached","role description",
  "requirements include","responsibilities include","must have experience","nice to have",
  "apply now","apply today","apply here","apply below","apply above",
  "apply via","apply through","apply on","apply using","submit your application","submit application",
  "application link","apply link","link to apply","apply in comments","apply in the comments",
  "send your resume","send resume","send your cv","send cv",
  "email your resume","email resume","email your cv","email cv",
  "dm me your resume","dm me resume","message me your resume","send me your resume",
  "dm me your cv","message me your cv",
  "drop your resume","drop resume","share your resume","share resume",
  "forward your resume","forward resume",
  "reach out with your resume","reach out with your cv",
  "we're looking for","we are looking for","we're seeking","we are seeking","in search of",
  "we need a","we need an","we're adding a","we are adding a",
  "looking to hire","seeking to hire","looking to recruit","seeking to recruit",
  "referrals welcome","referral welcome","referral bonus","employee referral","please refer",
  "if you know someone","know someone who","tag someone who","share with someone",
  "send me a referral","open requisition","open req","req id","requisition id",
  "contract role","contract position","freelance role","freelance position","short-term contract",
  "part-time role","part time role","full-time role","full time role","internship opening","internship role",
  "#hiring","#werehiring","#wearehiring","#jobopening","#jobopenings","#openroles","#recruiting",
  "#careers","#careerservice","#vacancy","#vacancies"
];
const GUARANTEED_HIRING_REGEX = [
  /\bwe\s*(are|'re)\s*(actively\s*)?hiring\b/i,
  /\b(now|currently|actively)\s+hiring\b/i,
  /\b(open|available)\s+(roles?|positions?|openings?)\b/i,
  /\bapply\s+(here|now|today|below|above|via|through)\b/i,
  /\b(dm|inbox|message)\s+me\s+(your\s+)?(resume|cv)\b/i,
  /\b(email)\s+(me\s+)?(your\s+)?(resume|cv)\b/i,
  /\breferrals?\s+(welcome|needed)\b/i,
  /\b(req(uisition)?\s*(id|#)?\s*[:#]?\s*\w+)\b/i
];

const GUARANTEED_HIRED_ANNOUNCEMENT_PHRASES = [
  "i'm excited to announce","i am excited to announce","excited to announce",
  "i'm thrilled to announce","i am thrilled to announce","thrilled to announce",
  "i'm happy to announce","i am happy to announce","happy to announce",
  "i'm pleased to announce","i am pleased to announce","pleased to announce",
  "i'm delighted to announce","i am delighted to announce","delighted to announce",
  "excited to share","thrilled to share","happy to share","proud to share","pleased to share",
  "excited to share that i","thrilled to share that i","happy to share that i","proud to share that i",
  "i've accepted","i have accepted","accepted an offer","offer accepted",
  "grateful to accept","honored to accept","excited to accept","thrilled to accept",
  "i'm joining","i am joining","i'll be joining","i will be joining","will be joining",
  "joining the team","joining the team at","joining the team of",
  "starting a new role","starting my new role","starting a new position","starting my new position",
  "starting a new job","starting my new job",
  "beginning a new role","beginning my new role","beginning a new position","beginning my new position",
  "officially starting","officially starting at","officially beginning",
  "excited to start","thrilled to start","excited to begin","thrilled to begin",
  "can't wait to start","cant wait to start","can't wait to begin","cant wait to begin",
  "i'm starting as","i am starting as","i'll be starting as","i will be starting as",
  "i'm joining as","i am joining as","i'll be joining as","i will be joining as",
  "i'm excited to start as","i am excited to start as",
  "new chapter","next chapter","new journey","next journey","new adventure",
  "beginning my journey","starting my journey",
  "super excited to","beyond excited to","incredibly excited to",
  "humbled to","honored to","grateful for this opportunity",
  "i'm excited to share that i'll be interning","i am excited to share that i will be interning",
  "i'll be interning at","i will be interning at","excited to intern at",
  "starting my internship at","beginning my internship at",
  "co-op at","interning at","summer intern at","incoming intern",
  "incoming software engineer intern","incoming swe intern","incoming intern at",
  "#newrole","#newjob","#newposition","#grateful","#excited","#internship","#intern",
  "#incomingintern","#startingsoon"
];

const GUARANTEED_HIRED_ANNOUNCEMENT_REGEX = [
  /\b(i\s*(am|'m)\s*)?(excited|thrilled|happy|pleased|delighted|proud)\s+to\s+(announce|share)\b/i,
  /\b(accepted|accepting)\s+(an\s+)?offer\b/i,
  /\b(joining|starting|beginning)\s+(a\s+)?new\s+(role|job|position)\b/i,
  /\b(i\s*(am|'m)|i\s+will|i\s*'ll)\s+be\s+(joining|starting|beginning)\b/i,
  /\b(incoming)\s+\w+\s+(intern|co-?op)\b/i
];

const GUARANTEED_GRINDSET_PHRASES = [
  "rise and grind","grindset","sigma grindset","alpha mindset",
  "while you were sleeping","while you slept","no days off","no weekends",
  "work harder","outwork everyone","outwork the competition","stay hard",
  "discipline equals freedom","discipline > motivation","motivation is temporary",
  "nobody cares work harder","do it tired","sleep is for the weak",
  "the grind never stops","hustle never stops","obsessed","be obsessed",
  "4am","4 am","5am","5 am","4am club","5am club",
  "cold shower","cold showers","two a days","double sessions",
  "lock in","locked in","locking in","locked tf in",
  "grind harder","hustle harder","keep grinding",
  "i don't take days off","i dont take days off",
  "work while they sleep","work when they sleep",
  "you have the same 24 hours","24 hours"
];

const GUARANTEED_GRINDSET_REGEX = [
  /\b(rise\s+and\s+grind|grindset)\b/i,
  /\b(no\s+days?\s+off|no\s+weekends?)\b/i,
  /\b(outwork|hustle|grind)\b/i,
  /\b(4|5)\s*:?00?\s*(am)?\b/i
];

const GUARANTEED_AI_DOOMER_PHRASES = [
  "swe is dead","software engineering is dead","coding is dead","programming is dead",
  "stop learning to code","don't learn to code","do not learn to code",
  "ai will replace developers","ai will replace engineers","ai will replace programmers",
  "ai will replace all developers","ai will replace all engineers","ai will replace all programmers",
  "developers are obsolete","engineers are obsolete","programmers are obsolete",
  "developers are finished","engineering is over","software engineering is over",
  "juniors are cooked","junior devs are cooked","entry level is dead","entry-level is dead",
  "no one will hire juniors","no junior roles","junior roles are gone",
  "agents will replace","ai agents will replace","llms will replace",
  "prompt engineering is the future","become a prompt engineer",
  "ai writes better code","ai can do it faster","replace the whole team",
  "your job will be automated","automation will replace you"
];

const GUARANTEED_AI_DOOMER_REGEX = [
  /\b(swe|software\s+engineering|programming|coding)\s+(is\s+)?(dead|over)\b/i,
  /\b(ai|llm|agents?)\s+will\s+replace\b/i,
  /\b(juniors?|entry\s*-?\s*level)\s+(are\s+)?(cooked|dead|gone)\b/i,
  /\b(stop|dont|don't)\s+learn(ing)?\s+to\s+code\b/i
];

const GUARANTEED_CHILD_PRODIGY_PHRASES = [
  "high schooler built","high schooler created","high schooler founded","high schooler launched",
  "middle schooler built","middle schooler created","teenager built","teen built","teen founded",
  "teen founder","teen ceo","teenage founder","teenage ceo",
  "high school founder","high school ceo","middle school founder","middle school ceo",
  "in high school i","when i was 15","when i was 16","when i was 17","at 15 i","at 16 i","at 17 i",
  "15-year-old","16-year-old","17-year-old","14-year-old","13-year-old","12-year-old",
  "15 year old","16 year old","17 year old","14 year old","13 year old","12 year old",
  "i'm 15","i am 15","i'm 16","i am 16","i'm 17","i am 17",
  "grade 9","grade 10","grade 11","grade 12",
  "freshman in high school","sophomore in high school","junior in high school","senior in high school",
  "student founder at 16","started at 16","shipped at 16","raised at 16"
];

const GUARANTEED_CHILD_PRODIGY_REGEX = [
  /\b(1[2-7])\s*[- ]?\s*year\s*[- ]?\s*old\b/i,
  /\b(i\s*(am|'m))\s*(1[2-7])\b/i,
  /\b(grade\s*(9|10|11|12))\b/i,
  /\b(high\s+school(er)?|middle\s+school(er)?)\b/i
];

const ADS_SPONSORED_PHRASES = [
  "promoted","sponsored","learn more","sign up","register now","download","get the guide",
  "free trial","start your free trial","request a demo","book a demo","limited time","offer"
];
const ADS_SPONSORED_REGEX = [
  /\b(promoted|sponsored)\b/i,
  /\b(book|request)\s+(a\s+)?demo\b/i,
  /\b(start|claim)\s+(your\s+)?(free\s+)?trial\b/i
];

const SALES_PITCH_PHRASES = [
  "book a call","dm me","inbox me","message me","calendar link","limited spots",
  "clients","case study","roi","pipeline","my course","my program","cohort",
  "newsletter","subscribe","waitlist","join the waitlist"
];
const SALES_PITCH_REGEX = [
  /\b(dm|inbox)\s+me\b/i,
  /\bbook\s+(a\s+)?call\b/i,
  /\b(waitlist|cohort|program)\b/i
];

const JOB_SEEKING_PHRASES = [
  "open to work","#opentowork","looking for new opportunities","seeking new opportunities",
  "actively looking","any leads","please share","referral",
  "laid off","layoff","impacted by layoffs","my role was eliminated","position eliminated"
];
const JOB_SEEKING_REGEX = [
  /\b(open\s+to\s+work|#opentowork)\b/i,
  /\b(laid\s+off|layoffs?)\b/i,
  /\b(role|position)\s+(was\s+)?(eliminated|impacted)\b/i
];

const EVENT_WEBINAR_PHRASES = [
  "webinar","workshop","live session","panel","fireside chat","conference","summit",
  "register","registration","save your spot","save the date","speaker","speaking at"
];
const EVENT_WEBINAR_REGEX = [
  /\b(save the date)\b/i,
  /\b(register|registration)\b/i,
  /\b(speaking at|speaker)\b/i
];

const ENGAGEMENT_BAIT_PHRASES = [
  "agree?","thoughts?","what do you think?","comment below","comment '","type '",
  "like if","share if","repost if","tag someone","follow for more","part 2",
  "i'll send you","dm me '"
];
const ENGAGEMENT_BAIT_REGEX = [
  /\bcomment\s+["'][^"']+["']\b/i,
  /\bdm\s+me\s+["'][^"']+["']\b/i,
  /\btag\s+(someone|a friend|\d+)\b/i
];

const EDUCATIONAL_TIPS_REGEX = [
  /\b\d+\s+(tips|lessons|mistakes|steps|ways)\b/i,
  /\b(step\s*by\s*step)\b/i,
  /\b(here's\s+how|how\s+to)\b/i,
  /\b(checklist|framework|template|guide|playbook)\b/i
];

const PROJECT_LAUNCH_REGEX = [
  /\b(i|we)\s+(built|shipped|launched|released)\b/i,
  /\b(v1|v2|beta|public beta)\b/i,
  /\b(open\s*source|github|demo)\b/i,
  /\b(introducing|announcing)\b/i
];

const CONGRATS_CERTS_REGEX = [
  /\b(congrats|congratulations)\b/i,
  /\b(certification|certificate|credential|badge)\b/i,
  /\b(honored|humbled|grateful)\b/i
];

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

window.LinkedInFilter.extractPostText = function(postElement) {
  if (!postElement) return '';
  
  const textSelectors = [
    '.feed-shared-update-v2__description',
    '.feed-shared-text-view',
    '.feed-shared-text',
    '[data-test-id="main-feed-activity-card__commentary"]',
    '.update-components-text',
    '.feed-shared-inline-show-more-text',
    '.feed-shared-text__text-view'
  ];
  
  let textContent = '';
  
  for (const selector of textSelectors) {
    const element = postElement.querySelector(selector);
    if (element) {
      textContent = element.innerText || element.textContent || '';
      if (textContent.trim()) {
        break;
      }
    }
  }
  
  if (!textContent.trim()) {
    const clone = postElement.cloneNode(true);
    const overlays = clone.querySelectorAll('.linkedin-filter-overlay, button, .feed-shared-social-action-bar');
    overlays.forEach(el => el.remove());
    textContent = clone.innerText || clone.textContent || '';
  }
  
  return textContent;
};

function matchesPhrases(text, phrases) {
  for (const phrase of phrases) {
    if (text.includes(phrase.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function matchesRegex(text, regexes) {
  for (const regex of regexes) {
    if (regex.test(text)) {
      return true;
    }
  }
  return false;
}

window.LinkedInFilter.classifyPost = function(postElement) {
  const postText = window.LinkedInFilter.extractPostText(postElement);
  const normalizedText = normalizeText(postText);
  
  if (matchesPhrases(normalizedText, GUARANTEED_HIRED_ANNOUNCEMENT_PHRASES) || 
      matchesRegex(postText, GUARANTEED_HIRED_ANNOUNCEMENT_REGEX)) {
    return "hired_announcement";
  }
  
  if (matchesPhrases(normalizedText, GUARANTEED_HIRING_PHRASES) || 
      matchesRegex(postText, GUARANTEED_HIRING_REGEX)) {
    return "hiring";
  }
  
  if (matchesPhrases(normalizedText, GUARANTEED_GRINDSET_PHRASES) || 
      matchesRegex(postText, GUARANTEED_GRINDSET_REGEX)) {
    return "grindset";
  }
  
  if (matchesPhrases(normalizedText, GUARANTEED_AI_DOOMER_PHRASES) || 
      matchesRegex(postText, GUARANTEED_AI_DOOMER_REGEX)) {
    return "ai_doomer";
  }
  
  if (matchesPhrases(normalizedText, GUARANTEED_CHILD_PRODIGY_PHRASES) || 
      matchesRegex(postText, GUARANTEED_CHILD_PRODIGY_REGEX)) {
    return "child_prodigy";
  }
  
  if (matchesPhrases(normalizedText, ADS_SPONSORED_PHRASES) || 
      matchesRegex(postText, ADS_SPONSORED_REGEX)) {
    return "sponsored";
  }
  
  if (matchesPhrases(normalizedText, SALES_PITCH_PHRASES) || 
      matchesRegex(postText, SALES_PITCH_REGEX)) {
    return "sales_pitch";
  }
  
  if (matchesPhrases(normalizedText, JOB_SEEKING_PHRASES) || 
      matchesRegex(postText, JOB_SEEKING_REGEX)) {
    return "job_seeking";
  }
  
  if (matchesPhrases(normalizedText, EVENT_WEBINAR_PHRASES) || 
      matchesRegex(postText, EVENT_WEBINAR_REGEX)) {
    return "events";
  }
  
  if (matchesPhrases(normalizedText, ENGAGEMENT_BAIT_PHRASES) || 
      matchesRegex(postText, ENGAGEMENT_BAIT_REGEX)) {
    return "engagement_bait";
  }
  
  if (matchesRegex(postText, EDUCATIONAL_TIPS_REGEX)) {
    return "educational";
  }
  
  if (matchesRegex(postText, PROJECT_LAUNCH_REGEX)) {
    return "project_launch";
  }
  
  if (matchesRegex(postText, CONGRATS_CERTS_REGEX)) {
    return "congrats";
  }
  
  return "other";
};
