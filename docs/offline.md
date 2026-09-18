# Offline Crypt and Library

## Use

Open the site online once to prepare the Angular service worker and card catalogs. Installing the PWA is optional. Crypt, Library, their filters and card details then work offline with the downloaded language; missing images show the existing crypt/library card backs.

Signed-in users can manage downloads in **Settings > Offline**, alongside profile and security settings. Profile and password changes have separate forms and save buttons; download, update and delete actions run independently. There is no separate offline route. There is no global offline-settings link. Card browsing remains public.

The panel shows saved-image count/size. Catalogs refresh automatically in the background, with no player controls. Images are cached when viewed; users can estimate and download all default images, cancel, continue missing downloads, revalidate saved images, or delete images independently of catalogs. Keep the app open while downloading. Reconnection never starts a bulk download.

## Storage and requests

- IndexedDB `vtesdecks`, version 2: crypt, library, set, meta and images. Catalog data and language/version metadata are replaced in the same transaction; synchronous serialization failures abort the transaction. Critical writes propagate failures to the UI.
- Cache Storage `vtesdecks-card-images-v1`: decoded, validated image bodies. IndexedDB holds URL, size and last successful check. Blob URLs are released when no view uses them.
- CardImagePipe combines the existing URL/printing resolver with the shared cache in grids, details and printing tooltips. A cached image is displayed before revalidation with `cache: no-cache`. Requests for the same URL are grouped. A valid new response updates persistence and fills missing views; existing views retain their first valid image. Invalid responses retain the previous image.
- Angular service worker prefetches app resources and existing card backs; it has no CDN image caching rule.
- ConnectivityService distinguishes navigator offline from an unavailable server. Catalog refreshes use the BACKGROUND_REFRESH HTTP context, so API errors do not trigger delayed retries or toast chains. Actual authorization errors are not classified as network loss.
- Shop and remote format selectors are hidden and inactive offline. Their URL values are retained and applied again on reconnection. Remote card information and collection actions are unavailable offline.
- Signed-in users can build new decks offline. Each editing session autosaves a separate local draft under its deck name. Entering the new-deck builder offers saved drafts to restore or delete, plus a fresh-deck option. Leaving unsaved work offers keep draft, discard draft, or continue editing. The app confirms that a draft is stored only after a successful write. Restoring retains the selected public/private status and Collection Tracker setting; ownership data refreshes online. Account saving remains online-only and leaves the local copy available. Drafts of existing decks are linked to their saved deck ID and offered only when reopening that deck; the new-deck picker lists only drafts without a saved deck ID. Saving an existing deck clears its linked recovery draft. Drafts have no automatic expiry and are not synchronized between devices.

Storage is browser-managed and may be evicted. Clearing site data removes local catalogs and images. Image preparation requests persistent storage, but the browser decides whether to grant it.

## Validation

Run `npm test -- --watch=false`, `npm run check:i18n`, `npm run lint`, and `npm run build`.

Builder direct-entry and offline draft workflows run in the existing Cypress suite (specs 31 and 32; see `e2e/README.md`).

After a production build, `node scripts/offline-smoke.mjs` runs an isolated headless Chrome profile against the real production service worker with deterministic API/CDN fixtures. It checks authenticated settings integration, text encoding, image downloads, cold offline card browsers/details, preserved shop filters and reconnect updates. Set CHROME_PATH if Chrome is installed elsewhere. It does not contact or change a real account.

Physical Android, Safari/iOS and installed-PWA checks remain release checks. The desktop smoke does not establish compatibility on those devices.

Card details show the existing text overlay automatically when no image is available; downloaded images retain the usual text-icon interaction. Remote deck search is hidden offline. Profile saving is enabled only when values differ from the last successful save. Image settings prioritize downloading missing default images, with download, update and delete controls always visible. A compact shell banner shows offline status and briefly confirms reconnection. Offline notices and the automatic card-text fallback are restricted to actual offline mode.

Image revalidation updates the cache without replacing a valid image already on screen. Each new view reads the latest cached copy, independently of existing views; a missing image is displayed as soon as it loads.
