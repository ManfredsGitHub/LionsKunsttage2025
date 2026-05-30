import io, os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame,
    Paragraph, Spacer, Image, Table, TableStyle, HRFlowable,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

W, H = A4
MARGIN = 1.8 * cm
BODY_W = W - 2 * MARGIN
COL_L = BODY_W * 0.44
COL_R = BODY_W * 0.56
FOOTER_H = 1.2 * cm

OLIVE      = colors.HexColor("#7a8c50")
DARK       = colors.HexColor("#1a1a1a")
BOX_BG     = colors.HexColor("#f4f4f2")
BOX_BORDER = colors.HexColor("#d0d0c8")
MID        = colors.HexColor("#555555")
GRAY_BOX   = colors.HexColor("#888888")


def S(name, **kw):
    d = dict(fontName="Helvetica", textColor=DARK, leading=14, fontSize=10)
    d.update(kw)
    return ParagraphStyle(name, **d)


def content_box(rows, col_width):
    t = Table([[r] for r in rows], colWidths=[col_width - 0.2*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), BOX_BG),
        ("BOX",           (0, 0), (-1, -1), 0.5, BOX_BORDER),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
    ]))
    return t


def section_block(heading, rows, col_width):
    return [
        Paragraph(heading, S("sh", fontSize=12, fontName="Helvetica-Bold",
                             spaceAfter=3, spaceBefore=10)),
        content_box(rows, col_width),
    ]


def text_to_paras(text, style):
    result = []
    for line in text.strip().split("\n"):
        line = line.strip()
        if line:
            result.append(Paragraph(line, style))
        else:
            result.append(Spacer(1, 3))
    return result


def draw_footer(canvas, doc):
    canvas.saveState()
    y = MARGIN - 0.2*cm
    canvas.setStrokeColor(OLIVE)
    canvas.setLineWidth(1)
    canvas.line(MARGIN, y + 0.4*cm, W - MARGIN, y + 0.4*cm)
    canvas.setFillColor(OLIVE)
    canvas.setFont("Helvetica", 14)
    canvas.drawString(MARGIN, y - 0.3*cm, "Lions Club Villa Ludwigshoehe")
    canvas.drawRightString(W - MARGIN, y - 0.3*cm,
                           "Kunsttage auf der Ludwigshoehe  2026")
    canvas.restoreState()


def generate_vita_pdf(kuenstler, bilder: list, upload_dir: str) -> bytes:
    buf = io.BytesIO()

    frame = Frame(MARGIN, MARGIN + FOOTER_H, BODY_W, H - 2*MARGIN - FOOTER_H,
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    template = PageTemplate(id="main", frames=[frame], onPage=draw_footer)
    doc = BaseDocTemplate(buf, pagesize=A4, pageTemplates=[template])

    story = []

    # Portrait
    portrait_path = None
    if kuenstler.portrait_foto:
        p = upload_dir.rstrip("/") + "/" + kuenstler.portrait_foto.replace("/uploads/", "")
        if os.path.exists(p):
            portrait_path = p

    portrait_el = (Image(portrait_path, width=5.5*cm, height=5.5*cm, kind="proportional")
                   if portrait_path else Spacer(5.5*cm, 5.5*cm))

    # Name + Beruf-Box
    name = f"{kuenstler.db_vorname or ''} {kuenstler.db_name}".strip()
    beruf = kuenstler.db_beruf or ""
    right_w = BODY_W - 5.8*cm

    beruf_el = Spacer(1, 0.4*cm)
    if beruf:
        beruf_table = Table(
            [[Paragraph(beruf, S("b2", fontSize=15, textColor=colors.white,
                                 leading=20, alignment=TA_CENTER))]],
            colWidths=[right_w - 0.2*cm],
        )
        beruf_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), GRAY_BOX),
            ("BOX",           (0, 0), (-1, -1), 0.5, GRAY_BOX),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ]))
        beruf_el = beruf_table

    name_col = [
        Spacer(1, 0.3*cm),
        Paragraph(name, S("n", fontSize=28, fontName="Helvetica-Bold", leading=32, spaceAfter=6)),
        HRFlowable(width="100%", thickness=1, color=OLIVE, spaceAfter=10),
        beruf_el,
    ]

    header = Table([[portrait_el, name_col]], colWidths=[5.8*cm, right_w])
    header.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header)
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=OLIVE, spaceAfter=6))

    # Linke Spalte
    body_s = S("bd", fontSize=9, leading=13)
    left_items = []

    if kuenstler.db_inspiration and kuenstler.db_inspiration.strip():
        left_items += section_block("Inspiration",
                                    text_to_paras(kuenstler.db_inspiration, body_s), COL_L)

    leben = kuenstler.db_lebenstext or kuenstler.db_kommentar or ""
    heading_l = "Leben/Ausbildung" if kuenstler.db_lebenstext else "Kurzbiografie"
    if leben.strip():
        left_items += section_block(heading_l, text_to_paras(leben, body_s), COL_L)

    # Rechte Spalte
    right_items = []

    if kuenstler.db_ausstellungen and kuenstler.db_ausstellungen.strip():
        aus_rows = []
        for line in kuenstler.db_ausstellungen.strip().split("\n"):
            line = line.strip().lstrip("•·-").strip()
            if line:
                aus_rows.append(Paragraph(
                    f"• {line}",
                    S("au", fontSize=9, leading=14, leftIndent=8, firstLineIndent=-8)))
        right_items += section_block("Ausstellungen / Auszeichnungen", aus_rows, COL_R)

    # Kontakt
    adresse = ", ".join(filter(None, [
        kuenstler.db_adresse,
        f"{kuenstler.db_plz or ''} {kuenstler.db_ort or ''}".strip() or None,
    ])) if (kuenstler.db_adresse or kuenstler.db_plz) else ""
    telefon = getattr(kuenstler, "db_telefon", None) or ""

    kontakt_rows = []
    for label, text in [
        ("Adr.",   adresse),
        ("Web",    kuenstler.db_webseite or ""),
        ("Tel.",   telefon),
        ("E-Mail", kuenstler.db_email or ""),
        ("Insta",  kuenstler.db_instagram or ""),
        ("FB",     kuenstler.db_facebook or ""),
    ]:
        zeile = f"<b>{label}</b>   {text.strip()}" if text.strip() else f"<b>{label}</b>"
        kontakt_rows.append(Paragraph(zeile, S("kk", fontSize=9, leading=16)))

    right_items += section_block("Kontakt", kontakt_rows, COL_R)

    # Body 2-Spalten
    def col_wrap(items, w):
        if not items:
            return Spacer(1, 1)
        t = Table([[i] for i in items], colWidths=[w - 0.3*cm])
        t.setStyle(TableStyle([
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
            ("TOPPADDING",    (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        return t

    body = Table(
        [[col_wrap(left_items, COL_L), col_wrap(right_items, COL_R)]],
        colWidths=[COL_L, COL_R],
    )
    body.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (0, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(body)

    doc.build(story)
    buf.seek(0)
    return buf.read()
