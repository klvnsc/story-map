import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  // Validate that it's an Instagram CDN URL for security
  if (!url.includes('cdninstagram.com') && !url.includes('scontent')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  
  try {
    console.log('Proxying image:', url.substring(0, 100) + '...');
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Story-Map-App/1.0)',
        'Referer': 'https://instagram.com/',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      // Cache the fetch for 6 hours (longer cache)
      next: { revalidate: 21600 }
    });

    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type');
    
    // Stream the response for better performance
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=21600, s-maxage=604800', // Cache for 6 hours, CDN for 1 week
        'Access-Control-Allow-Origin': '*',
        'ETag': response.headers.get('ETag') || undefined,
        'Last-Modified': response.headers.get('Last-Modified') || undefined,
      }
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}