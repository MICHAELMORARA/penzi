/**
 * Converts a relative image URL to a full backend URL
 * @param url - The relative or full URL
 * @returns Full URL pointing to the backend server
 */
export function getFullImageUrl(url: string | null | undefined): string {
  if (!url) {
    return '/images/default-avatar.png'; // Fallback to default avatar
  }

  // If it's already a full URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If it's a relative URL starting with /uploads/, convert to backend URL
  if (url.startsWith('/uploads/')) {
    // Always point directly to the backend for now
    const backendUrl = 'http://localhost:5000';
    const fullUrl = `${backendUrl}${url}`;
    console.log(`🖼️ Converting image URL: ${url} → ${fullUrl}`);
    return fullUrl;
  }

  // For other relative URLs, assume they're frontend assets
  return url;
}

/**
 * Gets the default avatar URL
 */
export function getDefaultAvatarUrl(): string {
  return '/images/default-avatar.png';
}