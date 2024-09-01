import os, requests
from datetime import datetime
from sitemapa import Sitemap, IndexSitemap

standard_sitemap = Sitemap()

standard_sitemap.append_url('https://vtesdecks.com', {
      'lastmod': datetime.today().strftime('%Y-%m-%d')
  })
standard_sitemap.append_url('https://vtesdecks.com/decks', {
      'lastmod': datetime.today().strftime('%Y-%m-%d')
  })
standard_sitemap.append_url('https://vtesdecks.com/cards/crypt', {
      'lastmod': datetime.today().strftime('%Y-%m-%d')
  })
standard_sitemap.append_url('https://vtesdecks.com/cards/library', {
      'lastmod': datetime.today().strftime('%Y-%m-%d')
  })
standard_sitemap.append_url('https://vtesdecks.com/contact', {
      'lastmod': datetime.today().strftime('%Y-%m-%d')
  })
standard_sitemap.append_url('https://vtesdecks.com/changelog', {
      'lastmod': datetime.today().strftime('%Y-%m-%d')
  })
standard_sitemap.append_url('https://vtesdecks.com/vtesdle', {
      'lastmod': datetime.today().strftime('%Y-%m-%d')
  })
r = requests.get('https://api.vtesdecks.com/1.0/decks?offset=0&limit=100000')
json = r.json()
for deck in json['decks']:
  standard_sitemap.append_url(f"https://vtesdecks.com/deck/{deck['id']}", {
      'lastmod': datetime.strptime(deck['modifyDate'], '%Y-%m-%dT%H:%M:%S').strftime('%Y-%m-%d')
  })




sitemap2_name = standard_sitemap.save('sitemap.xml')
