"""Publish a Markdown document or a directory of documents as FoundationOS PDFs."""

import argparse
import sys
import time
import os
from urllib.parse import unquote, urlsplit, urljoin
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory

from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor, Mm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE


ROOT = Path(__file__).resolve().parents[2]
INLINE = re.compile(r'\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)')


def add_inline(paragraph, text, source):
    cursor = 0
    for match in INLINE.finditer(text):
        paragraph.add_run(text[cursor:match.start()])
        if match[1]:
            paragraph.add_run(match[1]).bold = True
        else:
            target = match[3]
            if not urlsplit(target).scheme and not target.startswith('#'):
                linked = source.parent / unquote(target.split('#')[0])
                if not linked.exists():
                    raise ValueError(f'{source}: missing link {target}')
                if linked.suffix.lower() == '.md' and linked.is_relative_to(ROOT / 'Product Information'):
                    target = target.replace('.md', '.pdf')
                target = urljoin(source.as_uri(), target)
            link = OxmlElement('w:hyperlink')
            link.set(qn('r:id'), paragraph.part.relate_to(str(target), RELATIONSHIP_TYPE.HYPERLINK, is_external=True))
            run = paragraph.add_run(match[2], style='Hyperlink')
            link.append(run._r)
            paragraph._p.append(link)
        cursor = match.end()
    paragraph.add_run(text[cursor:])


def create_word(source, target):
    doc = Document()
    doc.core_properties.title = source.stem
    doc.core_properties.subject = 'FoundationOS product information'
    doc.core_properties.author = 'FoundationOS'
    section = doc.sections[0]
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    section.top_margin = Mm(24)
    header = section.header.paragraphs[0]
    header.paragraph_format.space_after = Pt(4)
    mark = header.add_run("FOUNDATIONOS    /    PRODUCT INFORMATION")
    mark.font.name = "Segoe UI"
    mark.font.size = Pt(9)
    mark.font.bold = True
    mark.font.color.rgb = RGBColor.from_string("126B67")
    border = OxmlElement("w:pBdr")
    rule = OxmlElement("w:bottom")
    for key, value in {"val":"single", "sz":"12", "color":"3C8D88", "space":"5"}.items():
        rule.set(qn("w:" + key), value)
    border.append(rule)
    header._p.get_or_add_pPr().append(border)
    section.bottom_margin = Inches(.72)
    section.left_margin = section.right_margin = Mm(22)
    section.header_distance = section.footer_distance = Inches(.45)
    normal = doc.styles['Normal']
    normal.font.name = 'Segoe UI'
    normal.font.color.rgb = RGBColor.from_string('233740')
    normal.font.size = Pt(10.5)
    normal.paragraph_format.line_spacing = 1.10
    normal.paragraph_format.space_after = Pt(5)
    for name, size in [('Title', 28), ('Heading 1', 16), ('Heading 2', 13)]:
        style = doc.styles[name]
        style.font.name = 'Segoe UI'
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string('184B52')
        style.paragraph_format.space_before = Pt(11)
        style.paragraph_format.keep_with_next = True
        style.paragraph_format.space_after = Pt(5)
    doc.styles['Title'].paragraph_format.space_before = Pt(0)
    for border in doc.styles['Title'].element.findall('.//' + qn('w:pBdr')):
        border.getparent().remove(border)
    doc.styles['List Bullet'].paragraph_format.space_after = Pt(5)
    if 'Hyperlink' not in doc.styles:
        link = doc.styles.add_style('Hyperlink', WD_STYLE_TYPE.CHARACTER)
        link.font.color.rgb = RGBColor.from_string('16477A')
        link.font.underline = True
    footer = section.footer.paragraphs[0]
    footer.add_run('FoundationOS  /  ' + source.stem).font.size = Pt(9)
    footer.add_run('   •   ').font.size = Pt(9)
    field = OxmlElement('w:fldSimple')
    field.set(qn('w:instr'), 'PAGE')
    footer._p.append(field)

    footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    table = None
    in_code = False
    for line in source.read_text(encoding='utf-8-sig').splitlines():
        if line.startswith('```'):
            in_code = not in_code
            continue
        if in_code:
            p = doc.add_paragraph()
            shade = OxmlElement('w:shd')
            shade.set(qn('w:fill'), 'E7F2F1')
            p._p.get_or_add_pPr().append(shade)
            p.paragraph_format.left_indent = Mm(3)
            p.paragraph_format.space_after = Pt(3)
            run = p.add_run(line)
            run.font.name = 'Consolas'
            run.font.size = Pt(9)
            continue
        if line.startswith('|'):
            cells = [cell.strip() for cell in line.strip('|').split('|')]
            if all(re.fullmatch(r':?-+:?', cell) for cell in cells):
                continue
            first_row = table is None
            if first_row:
                table = doc.add_table(rows=0, cols=len(cells))
                table.style = 'Table Grid'
            row = table.add_row()
            if first_row:
                row._tr.get_or_add_trPr().append(OxmlElement('w:tblHeader'))
            row._tr.get_or_add_trPr().append(OxmlElement('w:cantSplit'))
            for cell, value in zip(row.cells, cells, strict=True):
                para = cell.paragraphs[0]
                add_inline(para, value, source)
                if first_row:
                    tint = OxmlElement('w:shd')
                    tint.set(qn('w:fill'), '184B52')
                    cell._tc.get_or_add_tcPr().append(tint)
                    for run in para.runs:
                        run.bold = True
                        run.font.color.rgb = RGBColor.from_string('FFFFFF')
            continue
        table = None
        if not line.strip():
            continue
        heading = re.match(r'^(#{1,6}) (.*)', line)
        if heading:
            depth = len(heading[1])
            doc.add_paragraph(heading[2], 'Title' if depth == 1 else 'Heading ' + str(depth-1))
        elif line.startswith('- '):
            add_inline(doc.add_paragraph(style='List Bullet'), line[2:], source)
        else:
            add_inline(doc.add_paragraph(), line, source)
    doc.save(target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', nargs='?', type=Path, default=ROOT / 'Product Information')
    parser.add_argument('--watch', action='store_true', help='Check for changed Markdown every two seconds; Ctrl+C stops.')
    parser.add_argument('--changed', action='store_true', help='Publish only missing or outdated PDFs.')
    parser.add_argument('--soffice', default=shutil.which('soffice') or str(Path(os.getenv('ProgramFiles', '')) / 'LibreOffice/program/soffice.com'))
    args = parser.parse_args()
    while True:
        sources = sorted(args.source.rglob('*.md')) if args.source.is_dir() else [args.source]
        if not sources and not args.watch:
            parser.error('No Markdown documents found.')
        for source in sources:
            try:
                source = source.resolve(strict=True)
                if source.suffix.lower() != '.md':
                    parser.error('Expected Markdown source.')
                output = source.with_suffix('.pdf')
                newest = max(source.stat().st_mtime_ns, Path(__file__).stat().st_mtime_ns)
                if (args.watch or args.changed) and output.exists() and output.stat().st_mtime_ns >= newest:
                    continue
                publish(source, output, args.soffice)
            except (OSError, ValueError, subprocess.CalledProcessError) as error:
                if not args.watch:
                    raise
                print(f'{source}: {error}', file=sys.stderr, flush=True)
        if not args.watch:
            return
        time.sleep(2)


def publish(source, output, soffice):
    with TemporaryDirectory(prefix='foundationos-publish-') as temp:
        stage = Path(temp)
        docx = stage / (source.stem + '.docx')
        create_word(source, docx)
        subprocess.run([soffice, '-env:UserInstallation=' + (stage/'profile').as_uri(), '--headless',
                        '--convert-to', 'pdf', '--outdir', str(stage), str(docx)], check=True)
        with TemporaryDirectory(dir=output.parent) as adjacent:
            candidate = Path(adjacent) / output.name
            shutil.copyfile(docx.with_suffix('.pdf'), candidate)
            os.replace(candidate, output)
        print(output, flush=True)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
