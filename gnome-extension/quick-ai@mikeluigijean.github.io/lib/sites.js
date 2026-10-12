// The AI sites the chat window can show. Adding a site = adding one entry.
// Later extension points (not used yet): `kind` ('web' | 'native') and an optional `adapter`
// that can insert text into the page.
export const SITES = Object.freeze([
    {id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', kind: 'web'},
    {id: 'claude', name: 'Claude', url: 'https://claude.ai/new', kind: 'web'},
    {id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app', kind: 'web'},
]);

export const DEFAULT_SITE_ID = SITES[0].id;

/** The site with this id, or the default site when the id is unknown (e.g. a removed site). */
export function findSite(id) {
    return SITES.find(s => s.id === id) ?? SITES[0];
}

export function siteIndex(id) {
    return SITES.indexOf(findSite(id));
}
