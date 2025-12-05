import { NextRequest, NextResponse } from "next/server";

/**
 * API Route to proxy external websites
 * This bypasses CORS and X-Frame-Options restrictions
 *
 * Usage: /api/proxy?url=https://www.example.com
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 }
      );
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(targetUrl);
    } catch (error) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // console.log('🌐 Proxying request to:', targetUrl);

    // Fetch the target website
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      // console.error(
      //   "❌ Failed to fetch:",
      //   response.status,
      //   response.statusText
      // );
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // console.log("✅ Fetched successfully, status:", response.status);

    // Get the content
    let html = await response.text();
    // console.log("📄 HTML length:", html.length, "bytes");

    // Fix relative URLs to absolute URLs
    const baseUrl = `${url.protocol}//${url.host}`;

    // Replace relative URLs in src, href, action attributes
    html = html.replace(/src="\/([^"]+)"/g, `src="${baseUrl}/$1"`);
    html = html.replace(/href="\/([^"]+)"/g, `href="${baseUrl}/$1"`);
    html = html.replace(/action="\/([^"]+)"/g, `action="${baseUrl}/$1"`);

    // Add base tag to handle remaining relative URLs
    const baseTag = `<base href="${baseUrl}/">`;
    html = html.replace(/<head>/i, `<head>${baseTag}`);

    // console.log("✅ Successfully proxied and fixed URLs for:", targetUrl);

    // Create response with the modified HTML
    const proxyResponse = new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // CRITICAL: Don't set X-Frame-Options at all (let browser allow it)
        // 'X-Frame-Options': 'ALLOWALL', // This is invalid, remove it
        // Remove CSP that might block iframe
        // 'Content-Security-Policy': 'frame-ancestors *',
        // CORS headers
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        // Cache control
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });

    return proxyResponse;
  } catch (error) {
    // console.error("Proxy error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
