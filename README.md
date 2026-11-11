# COS30045 Project Design Dashboard

This project uses the exact folder and file naming structure supplied in `COS30045_ProjectDesign_Structure.zip`, with the dashboard pages, visual design, chart implementations, and source data taken from `Combine page1&2.zip`.

## Run locally

1. Open this folder in Visual Studio Code.
2. Start the project with the Live Server extension.
3. Open `index.html` in the browser.
4. Use the navigation links to open First Nations Peoples and States & Territories.

Do not open the HTML files directly from File Explorer: the dashboards load CSV data using browser requests and should be served through Live Server or another local web server.

## Project structure

- `index.html` — Hospitalisation dashboard.
- `first-nations.html` — First Nations Peoples dashboard.
- `states.html` — States & Territories dashboard.
- `css/` — Main dashboard stylesheet and accessibility stylesheet.
- `js/` — Constants, data loaders, page controllers, interactions, and chart modules.
- `data/Hospitalisations/` — National hospitalisation dataset.
- `data/First Nations People/` — Five First Nations chart datasets.
- `data/States & Territories/` — Reserved data folder from the supplied structure.

## Notes

The original dashboard content and design have been retained. File paths and script references were updated to match this project's folder and naming conventions. The former `config.js` has been consolidated into `js/constants.js`.
