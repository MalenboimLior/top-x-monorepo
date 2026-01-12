/**
 * Proxies an image URL through Firebase Function to avoid CORS issues
 * This is needed for images from sources that don't allow CORS (like Google Books API)
 * 
 * @param url - The original image URL
 * @returns The proxied URL that allows CORS
 */
export function getProxiedImageUrl(url: string): string {
  if (!url) return url;
  
  try {
    // Use Firebase Function to proxy the image
    // This ensures proper CORS headers and better reliability than public proxies
    // Using production URL - for local dev, deploy the function or run emulator
    const baseUrl = 'https://us-central1-top-x-co.cloudfunctions.net/proxyBookImage';
    
    const encodedUrl = encodeURIComponent(url);
    return `${baseUrl}?url=${encodedUrl}`;
  } catch (error) {
    console.error('Error proxying image URL:', error);
    return url; // Fallback to original URL
  }
}
