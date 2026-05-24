# Oh My Resume

A static Markdown resume editor that renders a compact technical A4 resume preview and exports through the browser print dialog.

## Run locally

```bash
npm run serve
```

Open <http://localhost:4173>.

## Test

```bash
npm test
```

## Export PDF

Click `Print / Save PDF`, then choose `Save as PDF` in the system print dialog.

Chrome is recommended for PDF export. In the print dialog, enable `Background graphics` so template decorations and accent blocks are included.

## Photos

Photos are controlled from the toolbar. Upload an image to add it to the preview, or click `Remove Photo` to clear it. Markdown `照片` or `头像` fields are ignored.

## Deployment

This project has no build step. It can be deployed directly with GitHub Pages by serving the repository root.
