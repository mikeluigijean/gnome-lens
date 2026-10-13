// The AI sites the chat window can show. Adding a site = adding one entry.
export const SITES = Object.freeze([
    {id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/'},
    {id: 'claude', name: 'Claude', url: 'https://claude.ai/new'},
    {id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app'},
]);

/** The site with this id, or the first site when the id is unknown (e.g. a removed site). */
export function findSite(id) {
    return SITES.find(s => s.id === id) ?? SITES[0];
}

export function siteIndex(id) {
    return SITES.indexOf(findSite(id));
}
