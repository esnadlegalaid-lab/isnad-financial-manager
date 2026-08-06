/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#102A2B',
    tint: '#0C8F74',

    // Core surfaces
    background: '#F5F8F6',
    foreground: '#102A2B',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#102A2B',

    // Primary action color (buttons, links, active states)
    primary: '#0C8F74',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E5F2ED',
    secondaryForeground: '#145B4C',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EDF2F0',
    mutedForeground: '#6D7D79',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#F7E8C8',
    accentForeground: '#8A5D14',

    // Destructive actions (delete, error states)
    destructive: '#D85555',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#DCE7E2',
    input: '#DCE7E2',
  },

  dark: {
    text: '#F2F7F4',
    tint: '#54C7A5',
    background: '#0D1B1A',
    foreground: '#F2F7F4',
    card: '#142624',
    cardForeground: '#F2F7F4',
    primary: '#54C7A5',
    primaryForeground: '#06251D',
    secondary: '#1C3832',
    secondaryForeground: '#BFEBDD',
    muted: '#18302C',
    mutedForeground: '#9BB5AD',
    accent: '#4B3B20',
    accentForeground: '#F4D08D',
    destructive: '#F08080',
    destructiveForeground: '#2B0909',
    border: '#25443D',
    input: '#31544B',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 16,
};

export default colors;
