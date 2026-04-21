/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "dommatrix"],
  // pdf.js worker é referenciado só por string; sem isso o arquivo some do bundle na Vercel e a rota quebra com HTML 500.
  outputFileTracingIncludes: {
    "/api/parse-resume": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    ],
  },
};

export default nextConfig;
