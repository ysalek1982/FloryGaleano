# PDF Export Evaluation

## Current Recommendation

Keep the current browser print-to-PDF flow for this phase. It preserves the existing printable report layouts, adds no runtime dependency to the main app path, and avoids introducing a heavy PDF renderer before table pagination requirements are more exact.

## Options Reviewed

| Option | Bundle Impact | Table Pagination | Repeated Headers | Styling Fidelity | Browser Compatibility | i18n | Maintenance Cost |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| Browser print-to-PDF | None | Browser controlled | CSS print support | High, reuses app markup | Good on modern desktop browsers | Existing UI strings | Low |
| jsPDF | Medium | Manual for complex tables | Manual or plugin | Medium | Good | Manual text mapping | Medium |
| pdfmake | Medium to high | Good declarative tables | Good | Medium, separate document styles | Good | Manual text mapping | Medium |
| react-pdf | High if eagerly loaded | Good | Good | Separate component tree | Good | Manual text mapping | High |
| Server-side renderer | No frontend bundle impact | Excellent with Chromium/PDF engine | Excellent | High | Server controlled | Existing HTML/i18n possible | High infrastructure cost |

## Decision

Use browser print-to-PDF now and keep dedicated PDF generation as a future enhancement. If chef production sheets need guaranteed page numbers, repeated headers, or batch export in production, evaluate a server-side renderer first because it avoids client bundle growth and can reuse authenticated report HTML with controlled print CSS.

## Guardrails

- Keep export controls lazy-loaded and route-scoped.
- Do not add a PDF library unless it is dynamically imported and validated against bundle output.
- Preserve printable HTML reports as the source of truth.
- Validate report tables in English and Spanish before replacing the current flow.
