/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow remote images from common band-site sources (album art, CDNs).
    // Add your own hosts here as needed.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
