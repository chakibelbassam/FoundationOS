"""Publish a Markdown document or a directory of documents as FoundationOS PDFs."""

import argparse
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
from docx.shared import Inches, Pt, RGBColor
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
    section.top_margin = Inches(.83)
    section.bottom_margin = Inches(.72)
    section.left_margin = section.right_margin = Inches(.9)
    section.header_distance = section.footer_distance = Inches(.45)
    normal = doc.styles['Normal']
    normal.font.name = 'Calibri'
    normal.font.size = Pt(11.5)
    normal.paragraph_format.line_spacing = 1.10
    normal.paragraph_format.space_after = Pt(5)
    for name, size in [('Title', 31), ('Heading 1', 22), ('Heading 2', 14)]:
        style = doc.styles[name]
        style.font.name = 'Calibri'
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string('184B52')
        style.paragraph_format.space_before = Pt(14)
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

    table = None
    in_code = False
    for line in source.read_text(encoding='utf-8-sig').splitlines():
        if line.startswith('```'):
            in_code = not in_code
            continue
        if in_code:
            run = doc.add_paragraph().add_run(line)
            run.font.name = 'Consolas'
            run.font.size = Pt(9)
            continue
        if line.startswith('|'):
            cells = [cell.strip() for cell in line.strip('|').split('|')]
            if all(re.fullmatch(r':?-+:?', cell) for cell in cells):
                continue
            if table is None:
                table = doc.add_table(rows=0, cols=len(cells))
                table.style = 'Light Shading Accent 1'
            row = table.add_row()
            for cell, value in zip(row.cells, cells, strict=True):
                add_inline(cell.paragraphs[0], value, source)
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
    parser.add_argument('--soffice', default=shutil.which('soffice') or str(Path(os.getenv('ProgramFiles', '')) / 'LibreOffice/program/soffice.com'))
    args = parser.parse_args()
    sources = sorted(args.source.rglob('*.md')) if args.source.is_dir() else [args.source]
    if not sources:
        parser.error('No Markdown documents found.')
    with TemporaryDirectory(prefix='foundationos-publish-') as temp:
        stage = Path(temp)
        for i, source in enumerate(sources):
            source = source.resolve(strict=True)
            if source.suffix.lower() != '.md':
                parser.error('Expected Markdown source.')
            folder = stage / str(i)
            folder.mkdir()
            docx = folder / (source.stem + '.docx')
            create_word(source, docx)
            subprocess.run([args.soffice, '-env:UserInstallation=' + (stage/'profile').as_uri(), '--headless',
                            '--convert-to', 'pdf', '--outdir', str(folder), str(docx)], check=True)
            output = source.with_suffix('.pdf')
            shutil.copyfile(docx.with_suffix('.pdf'), output)
            print(output)


if __name__ == '__main__':
    main()
