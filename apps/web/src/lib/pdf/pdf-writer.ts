import type { PDFDocument, PDFFont, PDFPage, rgb as RgbFn } from "pdf-lib";

const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;

export class PdfWriter {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  rgb!: typeof RgbFn;
  y = PAGE_HEIGHT - MARGIN;

  static async create(): Promise<PdfWriter> {
    // pdf-lib est chargé à la demande : ~300 Ko qui ne doivent pas alourdir
    // le chargement initial de l'app pour les écrans qui n'impriment rien.
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const w = new PdfWriter();
    w.rgb = rgb;
    w.doc = await PDFDocument.create();
    w.page = w.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    w.font = await w.doc.embedFont(StandardFonts.Helvetica);
    w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold);
    return w;
  }

  text(value: string, opts: { size?: number; bold?: boolean; x?: number; gap?: number; color?: [number, number, number] } = {}) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.font;
    const [r, g, b] = opts.color ?? [0.1, 0.1, 0.12];
    this.page.drawText(value, { x: opts.x ?? MARGIN, y: this.y, size, font, color: this.rgb(r, g, b) });
    this.y -= size + (opts.gap ?? 6);
  }

  row(cells: Array<{ text: string; x: number; bold?: boolean; size?: number }>) {
    for (const cell of cells) {
      const font = cell.bold ? this.bold : this.font;
      this.page.drawText(cell.text, { x: cell.x, y: this.y, size: cell.size ?? 10, font, color: this.rgb(0.1, 0.1, 0.12) });
    }
    this.y -= 16;
  }

  space(n = 10) {
    this.y -= n;
  }

  /** Ajoute une nouvelle page si l'espace restant est insuffisant. Renvoie true si une nouvelle page a été créée. */
  ensureSpace(minRemaining: number): boolean {
    if (this.y - minRemaining < MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN;
      return true;
    }
    return false;
  }

  line() {
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.5,
      color: this.rgb(0.7, 0.7, 0.72),
    });
    this.y -= 10;
  }

  get width() {
    return PAGE_WIDTH;
  }

  get margin() {
    return MARGIN;
  }

  async save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}
