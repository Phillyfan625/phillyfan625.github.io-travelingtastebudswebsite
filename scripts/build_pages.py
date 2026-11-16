#!/usr/bin/env python3
"""Builds the static "Best food in <town>" pages and Top 5 pages from data/spots.json.

Run from the repo root after changing data/spots.json or data/top5.json:

    python3 scripts/build_pages.py

Writes best-food/index.html, best-food/<town>.html, top-5/<list>.html and
rewrites sitemap.xml. The pages are plain HTML so search engines can read
every restaurant name without running JavaScript.

data/top5.json (optional) is a list of:
    {"slug": "wings-south-jersey", "title": "Top 5 Wings in South Jersey",
     "intro": "...", "instagramCode": "DbwbA7NGpLY",
     "picks": [{"spot": "Exact Spot Name", "note": "why it made the list"}, ...]}
Picks are listed first place first. "spot" must match a name in spots.json.
"""
import html, json, os, re, collections, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://travelingtastebuds.org'
MIN_SPOTS = 7          # a town needs this many spots to get its own page
STATES = ('NJ', 'PA')

e = lambda s: html.escape(str(s or ''), quote=True)

def slug(name):
    s = str(name or '').lower().replace('&', ' and ')
    s = re.sub(r"['’]", '', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

HEAD = '''<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link rel="stylesheet" href="/styles.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Chewy&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <meta name="theme-color" content="#1e40af">
    <meta name="description" content="{desc}">
    <link rel="canonical" href="{url}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="author" content="Traveling Tastebuds">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{desc}">
    <meta property="og:image" content="{site}/ttb-og-image.png">
    <meta property="og:url" content="{url}">
    <meta property="og:site_name" content="Traveling Tastebuds">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">
{jsonld}
    </script>
    <style>
        .town-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; }}
        .town-card {{ background: #fff; border: 1px solid var(--glass-border, #e5e7eb); border-radius: 16px; padding: 1.25rem; display: flex; flex-direction: column; }}
        .town-card-top {{ display: flex; align-items: center; gap: 0.9rem; margin-bottom: 0.6rem; }}
        .town-card-top img {{ width: 56px; height: 56px; border-radius: 12px; object-fit: cover; flex: none; }}
        .town-card h2, .town-card h3 {{ font-size: 1.1rem; margin: 0; font-family: 'Poppins', sans-serif; font-weight: 600; }}
        .town-card .rank {{ font-family: 'Chewy', cursive; font-size: 1.6rem; color: var(--accent, #f7a94b); flex: none; }}
        .town-card p {{ font-size: 0.9rem; color: var(--text-muted, #6b7280); margin: 0 0 0.6rem; }}
        .town-links {{ margin-top: auto; display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; font-size: 0.85rem; font-weight: 600; }}
        .town-links a {{ color: var(--header-color, #1e40af); text-decoration: none; }}
        .town-links a:hover {{ text-decoration: underline; }}
        .town-chips {{ display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }}
        .town-chips a {{ padding: 0.45rem 1rem; border-radius: 50px; border: 1px solid var(--glass-border, #e5e7eb); background: #fff; color: var(--header-color, #1e40af); text-decoration: none; font-weight: 600; font-size: 0.9rem; }}
        .town-chips a:hover {{ background: var(--header-color, #1e40af); color: #fff; }}
    </style>
</head>

<body>
    <script src="/navbar-loader.js"></script>
'''

FOOT = '''
    <div id="footer-container"></div>
    <script>
        fetch('/footer.html').then(function (r) { return r.text(); })
            .then(function (html) { document.getElementById('footer-container').innerHTML = html; })
            .catch(function () {});
    </script>
</body>

</html>
'''

def hero(h1, sub):
    return ('    <section class="services-hero">\n        <div class="hero-content">\n'
            '            <h1 class="section-title" style="font-size: 2.5rem;">%s</h1>\n'
            '            <p class="section-subtitle">%s</p>\n            <hr class="section-divider">\n'
            '        </div>\n    </section>\n') % (e(h1), sub)

def card(s, rank=None, note=None, heading='h2'):
    links = []
    if s.get('tiktokId'):
        links.append('<a href="https://www.tiktok.com/@travelingtastebuds/video/%s" target="_blank" rel="noopener"><i class="fab fa-tiktok"></i> Watch the review</a>' % e(s['tiktokId']))
    if re.fullmatch(r'[A-Za-z0-9_-]{5,40}', s.get('instagramCode') or ''):
        links.append('<a href="https://www.instagram.com/reel/%s/" target="_blank" rel="noopener"><i class="fab fa-instagram"></i> Instagram reel</a>' % e(s['instagramCode']))
    links.append('<a href="/food-map?spot=%s"><i class="fas fa-map-location-dot"></i> See it on the map</a>' % slug(s['name']))
    rating = float(s.get('rating') or 0)
    return ('            <article class="town-card">\n                <div class="town-card-top">%s'
            '<img src="%s" alt="%s logo" loading="lazy" width="56" height="56"><%s>%s</%s></div>\n'
            '                <p>%s%s</p>\n%s%s'
            '                <div class="town-links">%s</div>\n            </article>\n') % (
        '<span class="rank">#%d</span>' % rank if rank else '',
        e(s.get('logoImage') or '/Images/ttbLogo.png'), e(s['name']), heading, e(s['name']), heading,
        e(note or s.get('snippet') or ''), '' if note or not rank else '',
        '                <p><i class="fas fa-map-marker-alt" style="color:var(--accent);"></i> %s%s</p>\n' % (
            e(s['location']), (' &middot; <strong>%s/10</strong>' % (('%g' % rating))) if rating > 0 else ''),
        ('                <p><i class="fas fa-tag"></i> %s</p>\n' % e(s['discount'])) if s.get('discount') else '',
        ' '.join(links))

def page(path, title, desc, crumbs, body, items):
    url = SITE + '/' + path
    ld = [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u} for i, (n, u) in enumerate(crumbs)]}]
    if items:
        ld.append({"@context": "https://schema.org", "@type": "ItemList", "name": title, "numberOfItems": len(items),
                   "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": s['name'],
                                        "url": SITE + '/food-map?spot=' + slug(s['name'])} for i, s in enumerate(items)]})
    out = HEAD.format(title=e(title), desc=e(desc), url=url, site=SITE, jsonld=json.dumps(ld, indent=4, ensure_ascii=False)) + body + FOOT
    full = os.path.join(ROOT, path + '.html' if not path.endswith('/') else path + 'index.html')
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(out)
    return url

def main():
    spots = json.load(open(os.path.join(ROOT, 'data', 'spots.json'), encoding='utf-8'))
    by_name = {s['name']: s for s in spots}
    towns = collections.defaultdict(list)
    for s in spots:
        loc = s.get('location') or ''
        if loc[-2:] in STATES: towns[loc].append(s)
    towns = {k: v for k, v in towns.items() if len(v) >= MIN_SPOTS}
    order = sorted(towns, key=lambda k: (-len(towns[k]), k))
    urls = []

    chips = '        <div class="town-chips">\n' + ''.join(
        '            <a href="/best-food/%s">%s (%d)</a>\n' % (slug(k), e(k.split(',')[0]), len(towns[k])) for k in order) + '        </div>\n'

    for k in order:
        town, st = k.split(',')[0], k[-2:]
        lst = sorted(towns[k], key=lambda s: (-(float(s.get('rating') or 0)), s['name'].lower()))
        names = [s['name'] for s in lst]
        title = 'Best Food in %s, %s: %d Spots Reviewed | Traveling Tastebuds' % (town, st, len(lst))
        desc = 'Every %s restaurant PJ has reviewed for Traveling Tastebuds, including %s and %s. Watch the reviews and see each spot on the map.' % (town, names[0], names[1])
        body = hero('Best Food in %s, %s' % (town, st),
                    'All %d %s spots PJ has visited and reviewed for Traveling Tastebuds. Watch each review, then find it on the <a href="/food-map">food map</a>.' % (len(lst), e(town)))
        body += '    <section class="container" style="padding: 2rem 1rem 3rem;">\n        <div class="town-grid">\n' + ''.join(card(s) for s in lst) + '        </div>\n    </section>\n'
        body += '    <section class="container" style="padding: 0 1rem 4rem;">\n        <h2 class="section-title" style="font-size:1.6rem;text-align:center;">More towns</h2>\n' + chips + '    </section>\n'
        urls.append(page('best-food/' + slug(k), title, desc, [('Home', '/'), ('Best Food by Town', '/best-food/'), (town, '/best-food/' + slug(k))], body, lst))

    lists = []
    p5 = os.path.join(ROOT, 'data', 'top5.json')
    if os.path.exists(p5):
        for L in json.load(open(p5, encoding='utf-8')):
            picks = [(by_name[p['spot']], p.get('note')) for p in L['picks']]   # KeyError = name not in spots.json
            body = hero(L['title'], e(L.get('intro') or "PJ's ranking for Traveling Tastebuds."))
            body += '    <section class="container" style="padding: 2rem 1rem 4rem; max-width: 760px;">\n        <div class="town-grid" style="grid-template-columns: 1fr;">\n'
            body += ''.join(card(s, rank=i + 1, note=n) for i, (s, n) in enumerate(picks)) + '        </div>\n'
            if L.get('instagramCode'):
                body += '        <p style="text-align:center;margin-top:1.5rem;"><a href="https://www.instagram.com/reel/%s/" target="_blank" rel="noopener"><i class="fab fa-instagram"></i> Watch the full Top 5 video</a></p>\n' % e(L['instagramCode'])
            body += '    </section>\n'
            title = L['title'] + ' | Traveling Tastebuds'
            desc = "%s, ranked by PJ of Traveling Tastebuds: %s." % (L['title'], ', '.join(s['name'] for s, _ in picks))
            urls.append(page('top-5/' + L['slug'], title, desc, [('Home', '/'), ('Top 5 Lists', '/best-food/'), (L['title'], '/top-5/' + L['slug'])], body, [s for s, _ in picks]))
            lists.append(L)

    body = hero('Best Food by Town', 'Pick a town to see every spot PJ has reviewed there. %d restaurants across South Jersey, Philadelphia and the Shore are on the <a href="/food-map">food map</a>.' % len(spots))
    body += '    <section class="container" style="padding: 2rem 1rem 3rem;">\n' + chips + '    </section>\n'
    if lists:
        body += '    <section class="container" style="padding: 0 1rem 4rem;">\n        <h2 class="section-title" style="font-size:1.6rem;text-align:center;">Top 5 lists</h2>\n        <div class="town-chips">\n' + ''.join(
            '            <a href="/top-5/%s">%s</a>\n' % (L['slug'], e(L['title'])) for L in lists) + '        </div>\n    </section>\n'
    urls.insert(0, page('best-food/', 'Best Food by Town in South Jersey & Philly | Traveling Tastebuds',
                        'Browse Traveling Tastebuds food reviews by town: Philadelphia, Wildwood, Cherry Hill, Glassboro, Cape May, Ocean City and more.',
                        [('Home', '/'), ('Best Food by Town', '/best-food/')], body, None))

    # sitemap: keep hand-written entries, replace generated ones
    sm = os.path.join(ROOT, 'sitemap.xml'); x = open(sm, encoding='utf-8').read()
    x = re.sub(r'\s*<url>\s*<loc>%s/(best-food|top-5)/[^<]*</loc>.*?</url>' % re.escape(SITE), '', x, flags=re.S)
    today = datetime.date.today().isoformat()
    add = ''.join('\n    <url>\n        <loc>%s</loc>\n        <lastmod>%s</lastmod>\n        <changefreq>weekly</changefreq>\n        <priority>0.7</priority>\n    </url>' % (u, today) for u in urls)
    x = x.replace('\n</urlset>', add + '\n</urlset>')
    open(sm, 'w', encoding='utf-8').write(x)
    print('built', len(order), 'town pages,', len(lists), 'top 5 pages')

if __name__ == '__main__':
    main()
