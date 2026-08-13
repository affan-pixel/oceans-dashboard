#!/usr/bin/env python3
"""
crawl4ai mini-service — async HTTP server that accepts URLs and returns clean markdown.
Runs on port 3031. Called by the Oceans app as the primary scraping source.

POST /crawl  body: { "url": "https://..." }
→ { "success": true, "markdown": "...", "length": 1234 }
"""

import asyncio
import json
from aiohttp import web
from crawl4ai import AsyncWebCrawler

PORT = 3031
_crawler = None

async def get_crawler():
    global _crawler
    if _crawler is None:
        _crawler = AsyncWebCrawler(headless=True, verbose=False)
        await _crawler.start()
    return _crawler

async def handle_crawl(request):
    try:
        body = await request.json()
        url = body.get('url', '').strip()
        if not url:
            return web.json_response({'success': False, 'error': 'Missing url'}, status=400)

        crawler = await get_crawler()
        result = await crawler.arun(url=url, word_count_threshold=10, bypass_cache=False)

        if result.success and result.markdown:
            md = result.markdown.raw_markdown or result.markdown.fit_markdown or ''
            return web.json_response({
                'success': True,
                'markdown': md[:20000],
                'length': len(md)
            })
        return web.json_response({'success': False, 'error': 'Crawl returned empty'})
    except Exception as e:
        return web.json_response({'success': False, 'error': str(e)}, status=500)

async def handle_health(request):
    return web.json_response({'ok': True, 'service': 'crawl4ai', 'port': PORT})

async def main():
    app = web.Application()
    app.router.add_post('/crawl', handle_crawl)
    app.router.add_get('/health', handle_health)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', PORT)
    await site.start()
    print(f'[crawl4ai-service] listening on port {PORT}', flush=True)
    # Keep running
    while True:
        await asyncio.sleep(3600)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n[crawl4ai-service] shutting down')
