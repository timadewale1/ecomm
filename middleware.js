const { NextResponse } = require('next/server');
const fetch = require('node-fetch');

const prerenderToken = 'DgWjIfRQHarYIzZX44Vg';

module.exports = async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';

  // Check if the request is from a bot
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);

  if (isBot) {
    console.log("Bot detected: Fetching prerendered content");
    const prerenderUrl = `https://service.prerender.io/${request.nextUrl.pathname}`;
    const headers = { 'X-Prerender-Token': prerenderToken };

    try {
      const response = await fetch(prerenderUrl, { headers });

      if (!response.ok) {
        console.error(`Failed to fetch prerendered content. Status: ${response.status}`);
        return NextResponse.rewrite(new URL('/500.html', request.url)); // Redirect to a 500 page if necessary
      }

      const html = await response.text();
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      });
      
    } catch (error) {
      console.error('Error fetching prerendered content:', error);
      return NextResponse.rewrite(new URL('/500.html', request.url)); // Redirect to a 500 page if necessary
    }
  }

  // Continue serving the React app for normal requests
  return NextResponse.next();
}
