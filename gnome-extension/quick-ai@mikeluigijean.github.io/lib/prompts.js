// Prompts for the Lens actions (lib/constants.js Action). Pure: the locale list comes from the caller
// (GLib.get_language_names()), so this is unit-tested without GLib.
import {Action} from './constants.js';

/** Languages offered in prefs (English names: the prompt is in English). Sorted. */
export const LANGUAGES = [
    'Arabic', 'Bengali', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Czech', 'Danish', 'Dutch', 'English',
    'Finnish', 'French', 'German', 'Greek', 'Hebrew', 'Hindi', 'Hungarian', 'Indonesian', 'Italian', 'Japanese',
    'Korean', 'Malay', 'Norwegian', 'Persian', 'Polish', 'Portuguese', 'Romanian', 'Russian', 'Spanish', 'Swahili',
    'Swedish', 'Tagalog', 'Thai', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese',
];

/**
 * The language to translate into: the user's override if set, otherwise the first real locale.
 * @param {string[]} localeNames e.g. ['fr_FR.UTF-8', 'fr_FR', 'fr', 'C']
 * @param {string} override free text from prefs ('' = system)
 */
export function targetLanguage(localeNames, override = '') {
    if (override.trim())
        return override.trim();
    const code = localeNames
        .map(name => name.split(/[._@]/)[0])
        .find(lang => lang && lang !== 'C' && lang !== 'POSIX');
    if (!code)
        return 'English';
    try {
        return new Intl.DisplayNames(['en'], {type: 'language'}).of(code) ?? 'English';
    } catch {
        return 'English';
    }
}

/** Prompt to go with an attached image. */
export function imagePrompt(action, language) {
    switch (action) {
    case Action.TRANSLATE:
        return `Translate the text in this image into ${language}.`;
    case Action.OCR:
        return 'Extract all the text in this image exactly as written, keeping line breaks. Reply with the text only.';
    default:
        return 'What is this? Explain it.';
    }
}

/** Full prompt for selected text (the text is quoted below the instruction). */
export function textPrompt(action, text, language) {
    const instruction = action === Action.TRANSLATE
        ? `Translate this into ${language}:`
        : 'Explain this:';
    return `${instruction}\n\n${text.trim()}`;
}
