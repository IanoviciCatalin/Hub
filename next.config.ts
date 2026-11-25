import type { NextConfig } from "next";

// Export static: site-ul devine fișiere HTML/CSS/JS care pot fi găzduite oriunde
// (Vercel, Netlify, GitHub Pages) fără server.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
