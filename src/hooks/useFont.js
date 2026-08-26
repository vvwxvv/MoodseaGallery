// hooks/useFont.js
'use client';
import { useContext, useMemo } from 'react';
import { LanguageContext } from '@/components/contexts/LanguageContext';
import {
  FONT_FACES,
  FONT_FAMILIES,
  TYPE_SCALE,
  LANG_DEFAULT,
  CJK_FALLBACK,
  TYPEFACE_GENERIC,
  TYPEFACE_DEFAULT_VARIANT,
} from '@/lib/typography';

// Wrap a family name for use inside a CSS font-family list.
const q = (name) => `'${name}'`;

/**
 * Build the language-default stack for a weight key.
 * Falls weight → regular → generic, so a missing @font-face (e.g. zh
 * `medium`, which isn't shipped) never yields a dead family name.
 */
function langDefaultStack(lang, weightKey) {
  const faces = FONT_FACES[lang] || FONT_FACES.en || {};
  const name = faces[weightKey] || faces.regular || null;
  const generic = LANG_DEFAULT[lang]?.generic || 'sans-serif';
  return name ? `${q(name)}, ${generic}` : generic;
}

/**
 * Build a display-typeface stack: <display face>, <CJK fallback>, <generic>.
 * Returns null if the typeface/variant can't be resolved, so the caller can
 * fall back to the language default.
 */
function displayStack(typeface, variant) {
  const set = FONT_FAMILIES[typeface];
  if (!set) return null;

  const key =
    (variant && set[variant] && variant) ||
    (set[TYPEFACE_DEFAULT_VARIANT[typeface]] && TYPEFACE_DEFAULT_VARIANT[typeface]) ||
    Object.keys(set)[0];

  const name = key && set[key];
  if (!name) return null;

  const generic = TYPEFACE_GENERIC[typeface] || 'serif';
  return `${q(name)}, ${q(CJK_FALLBACK)}, ${generic}`;
}

/**
 * Resolve the full font-family stack for a role spec in a language.
 * A spec with `font` uses a display typeface (Palatino/Caslon/Iowan) with a
 * CJK fallback; otherwise the language-default face at `weight`.
 */
function resolveFamily(spec, lang) {
  if (spec?.font) {
    const stack = displayStack(spec.font, spec.variant);
    if (stack) return stack;
  }
  return langDefaultStack(lang, spec?.weight || 'regular');
}

/**
 * useFont(role)
 *
 * Returns:
 *   - fontFamily              full CSS stack for the requested role
 *   - style                   inline style (fontFamily + size/lineHeight/
 *                             letterSpacing when the role defines them)
 *   - contentFontFamily       body/content text stack   (role: bodyText)
 *   - contentTitleFontFamily  title/heading stack       (role: sectionTitle)
 *   - inputFontFamily         form input stack          (role: input)
 *   - buttonFontFamily        button label stack        (role: button)
 *   - labelFontFamily         form label stack          (role: label)
 *
 * Unknown roles (undefined, "13px", booleans, or a role not in TYPE_SCALE)
 * degrade to the `body` role instead of crashing. Alias roles that don't
 * exist in TYPE_SCALE resolve to the language-default regular stack.
 */
export default function useFont(role) {
  const { isCn } = useContext(LanguageContext);
  const lang = isCn ? 'zh' : 'en';

  return useMemo(() => {
    const familyForRole = (r) => resolveFamily(TYPE_SCALE[r]?.[lang], lang);

    const effectiveRole =
      role && typeof role === 'string' && TYPE_SCALE[role] ? role : 'body';

    const spec = TYPE_SCALE[effectiveRole]?.[lang];
    const fontFamily = resolveFamily(spec, lang);

    // Only emit size/line-height/letter-spacing the role actually defines —
    // weight-only roles must not leak "undefinedpx" into inline styles.
    const style = { fontFamily };
    if (spec?.fontSize != null) style.fontSize = `${spec.fontSize}px`;
    if (spec?.lineHeight != null) style.lineHeight = `${spec.lineHeight}px`;
    if (spec?.letterSpacing != null) style.letterSpacing = `${spec.letterSpacing}em`;

    return {
      fontFamily,
      style,
      contentFontFamily: familyForRole('bodyText'),
      contentTitleFontFamily: familyForRole('sectionTitle'),
      inputFontFamily: familyForRole('input'),
      buttonFontFamily: familyForRole('button'),
      labelFontFamily: familyForRole('label'),
    };
  }, [role, lang]);
}
