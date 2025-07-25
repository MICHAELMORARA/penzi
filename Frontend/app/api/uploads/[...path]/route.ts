import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    // Use the backend base URL without /api suffix for uploads
    const BACKEND_BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';
    const backendUrl = `${BACKEND_BASE_URL}/uploads/${path}`;
    
    console.log(`🖼️ Proxying image request to: ${backendUrl}`);
    
    // Forward the request to the backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        // Forward relevant headers
        'User-Agent': request.headers.get('user-agent') || '',
      },
    });

    if (!response.ok) {
      console.error(`❌ Backend responded with status: ${response.status} for ${backendUrl}`);
      return new NextResponse('File not found', { status: 404 });
    }

    // Get the file data
    const fileData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    console.log(`✅ Successfully proxied image: ${path}`);

    // Return the file with appropriate headers
    return new NextResponse(fileData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('❌ Error proxying upload request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}