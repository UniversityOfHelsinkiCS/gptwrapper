# Fonts for the PDF export

Noto Sans (regular, bold, italic, bold italic) and Noto Sans Mono are embedded in the conversation PDF export
(`src/client/components/ChatV2/exportPdf.ts`). Tagged, accessible PDFs (PDF/UA) need embedded fonts, and these cover
the Finnish and Swedish letters and many symbols. They are loaded only when someone downloads a PDF.

Licensed under the SIL Open Font License 1.1, see `OFL.txt`.
