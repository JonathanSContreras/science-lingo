/** @type {import('next').NextConfig} */

// Check if we are in production to apply the basePath conditionally
// This keeps your local development (npm run dev) working normally
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  // 1. Tell Next.js to do a static export
  output: 'export',
  
  // 2. Set the base path to your repository name
  // (Only needed if deploying to https://<username>.github.io/<repo-name>)
  // If you are using a custom domain, leave this as an empty string: ''
  basePath: isProd ? '/science-lingo' : '',

  // 3. Disable server-based image optimization
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
