"use client";

import React from "react";
import { Box } from "@mui/material";
import { Phone, Mail, MapPin, Youtube, Instagram, Globe } from "lucide-react";

/**
 * ContactInfo — icon-based contact block (no text labels).
 *
 * Design note: the gallery replaced the old “Tel: / Email: / Address: …”
 * text labels with small circled icons — cleaner, younger and more
 * efficient. Same block is shared by the About page and the Contact page.
 *
 * Rows render in this order: phone → email → address → social media,
 * followed by the opening-hours line (bold).
 */

// ─────────────────────────────────────────────────────────────────────────────
//  TOKENS — visual config for the whole block (override via props if needed)
// ─────────────────────────────────────────────────────────────────────────────
export const CONTACT_TOKENS = Object.freeze({
  rowGap: "12px", // vertical gap between rows
  icon: {
    size: 17, // circle diameter (px)
    glyph: 9, // glyph size inside the circle (px)
    stroke: 1.25, // circle border width
    glyphStroke: 2, // glyph stroke width
    gap: "10px", // icon ↔ text gap
    opacity: 0.75, // resting icon opacity (→ 1 on hover)
  },
  text: {
    size: "13px",
    weight: 400,
    opacity: 0.72,
  },
  hours: {
    weight: 700,
    opacity: 1,
    marginTop: "26px",
    letterSpacing: "0.01em",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  Icons
// ─────────────────────────────────────────────────────────────────────────────
const RedGlyph = ({ size }) => (
  // RED / 小红书：圆角矩形（书页）＋ 底部横线
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="4.5" y="5.5" width="15" height="13" rx="2.5" />
    <path d="M8.5 14.5h7" />
  </svg>
);

// platform string → icon key (lenient: handles EN/CN and old/new naming)
export const resolveIconKey = (platform) => {
  const k = String(platform || "").toLowerCase();
  if (k.includes("you")) return "youtube";
  if (k.includes("insta")) return "instagram";
  if (k.includes("red") || k.includes("xiaohong") || k.includes("小紅書") || k.includes("小红书"))
    return "red";
  return "globe";
};

export const ContactIcon = ({ name }) => {
  const { size, glyph, stroke, glyphStroke, opacity } = CONTACT_TOKENS.icon;
  const lucideProps = { size: glyph, strokeWidth: glyphStroke, absoluteStrokeWidth: true };

  let inner;
  switch (name) {
    case "phone":
      inner = <Phone {...lucideProps} />;
      break;
    case "email":
      inner = <Mail {...lucideProps} />;
      break;
    case "address":
      inner = <MapPin {...lucideProps} />;
      break;
    case "youtube":
      inner = <Youtube {...lucideProps} />;
      break;
    case "instagram":
      inner = <Instagram {...lucideProps} />;
      break;
    case "red":
      inner = <RedGlyph size={glyph} />;
      break;
    case "globe":
    default:
      inner = <Globe {...lucideProps} />;
      break;
  }

  return (
    <Box
      component="span"
      aria-hidden="true"
      className="moodsea-contact-icon"
      sx={{
        flex: "0 0 auto",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        border: `${stroke}px solid currentColor`,
        opacity,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.2s ease",
      }}
    >
      {inner}
    </Box>
  );
};

export const ContactRow = React.memo(function ContactRow({ icon, children, href, fontFamily, style }) {
  const { gap } = CONTACT_TOKENS.icon;
  const content = (
    <>
      <ContactIcon name={icon} />
      <span style={{ minWidth: 0, wordBreak: "break-word" }}>{children}</span>
    </>
  );

  const rowStyle = {
    fontFamily,
    fontSize: CONTACT_TOKENS.text.size,
    fontWeight: CONTACT_TOKENS.text.weight,
    opacity: CONTACT_TOKENS.text.opacity,
    display: "flex",
    alignItems: "center",
    gap,
    lineHeight: 1.5,
    ...style,
  };

  if (href) {
    const isExternal = href.startsWith("http");
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="moodsea-contact-row"
        style={{ ...rowStyle, color: "inherit", textDecoration: "none" }}
      >
        {content}
      </a>
    );
  }

  return <div style={rowStyle}>{content}</div>;
});

// ─────────────────────────────────────────────────────────────────────────────
//  Data helper
// ─────────────────────────────────────────────────────────────────────────────
export function normalizeContact(raw) {
  if (!raw) return null;
  const rawSocial = raw.social_media ?? raw.socialMedia ?? [];
  const socialMedia = Array.isArray(rawSocial)
    ? rawSocial.filter((s) => s && (s.platform || s.account || s.url))
    : [];
  return {
    phone: raw.phone ?? "",
    email: raw.email ?? "",
    address: Array.isArray(raw.address) ? raw.address.join(", ") : raw.address ?? "",
    openingTime: raw.opening_time ?? raw.openingTime ?? "",
    socialMedia,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  ContactInfo
// ─────────────────────────────────────────────────────────────────────────────
export default function ContactInfo({ contact, fontFamily, rowGap, hoursMarginTop, sx }) {
  const info = React.useMemo(() => normalizeContact(contact), [contact]);
  if (!info) return null;

  const { phone, email, address, openingTime, socialMedia } = info;
  const gap = rowGap ?? CONTACT_TOKENS.rowGap;
  const hasRows = phone || email || address || socialMedia.length;
  if (!hasRows && !openingTime) return null;

  const hoursStyle = {
    fontFamily,
    fontSize: CONTACT_TOKENS.text.size,
    fontWeight: CONTACT_TOKENS.hours.weight,
    opacity: CONTACT_TOKENS.hours.opacity,
    margin: `${hoursMarginTop ?? CONTACT_TOKENS.hours.marginTop} 0 0 0`,
    letterSpacing: CONTACT_TOKENS.hours.letterSpacing,
  };

  return (
    <Box
      sx={{
        "& .moodsea-contact-row:hover .moodsea-contact-icon": { opacity: 1 },
        ...sx,
      }}
    >
      {phone && (
        <ContactRow icon="phone" href={`tel:${phone}`} fontFamily={fontFamily} style={{ marginBottom: gap }}>
          {phone}
        </ContactRow>
      )}
      {email && (
        <ContactRow icon="email" href={`mailto:${email}`} fontFamily={fontFamily} style={{ marginBottom: gap }}>
          {email}
        </ContactRow>
      )}
      {address && (
        <ContactRow icon="address" fontFamily={fontFamily} style={{ marginBottom: gap }}>
          {address}
        </ContactRow>
      )}
      {socialMedia.map((s, i) => (
        <ContactRow
          key={`${s.platform || "social"}-${i}`}
          icon={resolveIconKey(s.platform)}
          href={s.url || undefined}
          fontFamily={fontFamily}
          style={{ marginBottom: gap }}
        >
          {s.account || s.url || s.platform}
        </ContactRow>
      ))}
      {openingTime && <p style={hoursStyle}>{openingTime}</p>}
    </Box>
  );
}
