window.LinkedInFilter = window.LinkedInFilter || {};

window.LinkedInFilter.getActivityUrn = function(el) {
  const urn = el.getAttribute('data-urn');
  if (urn && (urn.startsWith('urn:li:activity:') || urn.startsWith('urn:li:aggregate:'))) {
    return urn;
  }
  if (el.getAttribute('data-slopblock-urn')) {
    return el.getAttribute('data-slopblock-urn');
  }
  if (el.matches && el.matches('div[role="article"][data-urn^="urn:li:activity:"], div[role="article"][data-urn^="urn:li:aggregate:"]')) {
    return el.getAttribute('data-urn');
  }
  const article = el.querySelector('div[role="article"][data-urn^="urn:li:activity:"], div[role="article"][data-urn^="urn:li:aggregate:"]');
  if (article) {
    return article.getAttribute('data-urn');
  }
  const anyUrn = el.querySelector && el.querySelector('[data-urn^="urn:li:activity:"], [data-urn^="urn:li:aggregate:"]');
  if (anyUrn) {
    return anyUrn.getAttribute('data-urn');
  }
  return null;
};

window.LinkedInFilter.getOrAssignNewDomUrn = function(listItem) {
  let urn = window.LinkedInFilter.getActivityUrn(listItem);
  if (urn) return urn;
  urn = 'urn:li:activity:new-' + (++window.LinkedInFilter.newDomIdCounter);
  listItem.setAttribute('data-slopblock-urn', urn);
  return urn;
};
