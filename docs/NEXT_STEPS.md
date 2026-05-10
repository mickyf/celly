## Bugs
- ~~edit of wine doesn't work~~
- ~~add a tasting note fails with `TypeError: values.tasted_at.toISOString is not a function at handleAddNote ($id.tsx:83:35)`~~
- ~~language picker on mobile is to big, use flags (Swiss and British) only~~
- ~~fix image not completely displayed~~
- ~~make language Swiss-German de-ch default~~
- ~~fix wrong language returned on food pairing recomendations~~
- ~~Winery AI Enrichment doesn't work well~~
- ~~move image upload to the top of the form~~
- ~~issue with Sentry Replay Events: detail: "invalid event envelope", causes: "missing newline after header or payload"~~

## New Features
- ~~add cancel buttons to add and edit~~
- ~~add translation to all strings~~
- ~~translate to Swiss-German~~
- ~~analyse the changes since creation of CLAUDE.md and update CLAUDE.md accordingly~~
- ~~add Winery~~
- ~~add AI data update to fill in missing values like Grapes, Price, or Drinking Window~~
- ~~add camera capability to add wine image ad-hoc with camera besides the image upload~~
- ~~add stock inventory to track in and out of wines~~
- ~~change the currency from USD to CHF~~
- ~~change date format to Swiss style~~
- ~~add a back button to the detail view~~
- ~~store wine filters in the url as search params~~
- ~~fix typescript issues~~
- ~~/init to update CLAUDE.md~~
- ~~add food pairings to the wine incl. AI enrichment~~
- ~~add bottle size, e.g. 75cl, 150cl, ...~~
- ~~make cancel and save buttons sticky on bottom~~
- ~~better navigation~~
- ~~Sentry.io integration for error and performance monitoring~~
- ~~add Sentry.io tunneling to prevent adblocker blocks, maybe leveraging Supabase Edge Functions~~
- ~~route AI API request via Supabase Edge Function to not expose the API key~~
- ~~Login page: password forget~~
- ~~image capture (camera) in full screen~~
- ~~Settings per User~~
- ~~AI API key per user~~
- ~~AI enrichment with image of wine bottle~~
- ~~add location of wine in cellar, e.g. cellar 1, shelf 2, position 3~~
- ~~PWA: App manifest with icon~~
- ~~merge 2 wineries together~~
- ~~merge 2 wines together~~
- ~~MCP server for adding a wine or winery~~

## bugs
- ~~image delete is not stored on wine~~
- ~~no feedback on single wine AI enrichement when there's nothing to enrich any more~~
- ~~adding a wine doesn't close the form, it should move to the detail view on success~~

## minor
- ~~remove degustation notes from dashboard~~
- ~~make dashboard cards clickable, not only the number~~
- ~~wine card: image clickable not only title~~
- ~~mobile view: buttons should collapse to icon only (no label) when not enough space on 1 line (enrich and add buttons)~~
- ~~mobile view: filter control: the expand ("Filter anzeigen") should be only the chevron, no label~~
- ~~mobile view: wine cards should hide the image block if no image is available (too many useless placeholder images are displayed on scrolling the list), but keep it if desktop~~
- ~~mobile view: top grapes card: badges should inline the count so we don't have the 2 column layout~~
- ~~move the merge button from the wine card to the detail view (next to edit)~~
- ~~wine detail view: set an image max height~~
- ~~remove obvious comments~~
- ~~mobile: we should reduce the gaps everywhere to save some space on mobile. So we have more space for the content.~~
- ~~mobile: the back button on all sub pages is not aligned on the left with the breadcrumbs or other content.~~
- ~~dashboard: "add your first wine" card makes no sense, when there are already wines. And it should be on top.~~
- ~~dashboard: the total and different wines cards should have a plus button to add wine from there.~~

## major
- ~~feature: password change function is missing~~
- ~~cellar overview:~~
  - ~~click on an empty place and select an un-placed wine to place it there~~
  - ~~click on a placed wine and select if remove from the place or open the wine~~ (also added "drink" which decrements stock)
  - ~~add wine: display the cellar overview and let the user click the places, where the bottles were placed. Like on a seat-booking-overview.~~
  - ~~wine location flow is unreliable: insert returns 409 Conflict, UX needs a rethink~~ (redesigned: each row is now a slot, wine_id nullable)
  - ~~simplify stock changes with an up- and down-button on the card~~
- ~~feature: add wine from free text input~~
- feature: add multiple wines from order document
- hide wines when drunken out in all the places, add a filter on the wine list to display "drunken" wines
- Branding: icon and logo
- find by AI: if the name was written wrong it finds the wine anyways, but the name is saved wrong. It should take the proper name then.

## security/technical
- ~~upgrade dependencies~~
- add a central error handling function