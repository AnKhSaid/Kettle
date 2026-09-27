import React from "react";

/** WhatsApp glyph (brand green bubble with the white handset). */
export const WhatsApp: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 56, style }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} style={style}>
    <path fill="#25D366" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 6.9L3 29l6.5-2c1.9 1 4.1 1.6 6.5 1.6 7.2 0 13-5.7 13-12.8S23.2 3 16 3z" />
    <path fill="#fff" d="M22.6 19.2c-.4-.2-2.1-1-2.4-1.1-.3-.1-.6-.2-.8.2-.2.4-.9 1.1-1.1 1.3-.2.2-.4.3-.8.1-.4-.2-1.5-.6-2.8-1.8-1-.9-1.7-2-1.9-2.4-.2-.4 0-.6.2-.8l.6-.7c.2-.2.2-.4.4-.6.1-.2 0-.5 0-.7l-1.1-2.6c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-1 .5-.3.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.9c.2.2 2.6 4 6.3 5.6 3.1 1.2 3.7 1 4.4.9.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.5.2-1.7 0-.2-.3-.3-.7-.5z" />
  </svg>
);
