"""Generate the original, three-page design specimen without third-party tools."""
from pathlib import Path

objects = []

def obj(value):
    objects.append(value.encode('latin1'))
    return len(objects)

def text(x, y, size, value, color='0.13 0.17 0.27', font='F1'):
    escaped = value.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
    return f'BT /{font} {size} Tf {color} rg 1 0 0 1 {x} {y} Tm ({escaped}) Tj ET\n'

def rect(x, y, w, h, color):
    return f'{color} rg {x} {y} {w} {h} re f\n'

def line(x, y, x2, y2, color='0.83 0.85 0.89'):
    return f'{color} RG 0.6 w {x} {y} m {x2} {y2} l S\n'

catalog = obj('<< /Type /Catalog /Pages 2 0 R >>')
obj('placeholder')
font1 = obj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
font2 = obj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')
font3 = obj('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>')

cover = rect(0, 0, 595, 842, '0.99 0.99 0.985')
cover += text(48, 782, 14, 'fieldwork', font='F2') + text(448, 783, 9, 'STUDIO NOTES')
cover += line(48, 764, 547, 764)
cover += text(48, 695, 10, 'A notebook for things worth making.')
cover += text(45, 604, 66, 'Room for', font='F2') + text(45, 531, 66, 'good ideas.', font='F2')
cover += text(49, 489, 15, 'Less noise. A little more possibility.', font='F3')
# An architectural paper composition: deliberate vector artwork, no remote images.
cover += rect(48, 145, 499, 287, '0.89 0.9 0.96')
cover += rect(85, 145, 112, 229, '0.64 0.65 0.84')
cover += rect(197, 145, 150, 177, '0.77 0.78 0.91')
cover += rect(347, 145, 163, 117, '0.37 0.41 0.61')
cover += rect(119, 374, 78, 16, '0.8 0.81 0.93')
cover += rect(223, 322, 124, 15, '0.86 0.87 0.96')
cover += rect(375, 262, 135, 14, '0.59 0.62 0.77')
cover += line(48, 98, 547, 98)
cover += text(48, 76, 9, 'An independent creative practice') + text(472, 76, 9, 'VOL. 01 / 26')

page2 = rect(0, 0, 595, 842, '0.99 0.99 0.985')
page2 += text(48, 782, 14, 'fieldwork', font='F2') + text(498, 783, 9, 'NOTES') + line(48, 764, 547, 764)
page2 += text(48, 691, 38, 'Start with a question.', font='F2')
page2 += text(48, 649, 15, 'The useful kind. The one that makes you look again.', font='F3')
for y, title, body in [(552, '01   Notice the ordinary.', ['Look closely at what already exists. The details we overlook', 'often hold the beginning of something new.']), (408, '02   Make room to experiment.', ['A first draft is an invitation, not a verdict. Keep the good parts,', 'change the rest, and give the idea another chance.']), (264, '03   Keep things simple.', ['Make every choice earn its place. Good work does not need', 'to be loud to be remembered.'])]:
    page2 += line(48, y + 35, 547, y + 35)
    page2 += text(48, y, 19, title, font='F2')
    for index, item in enumerate(body):
        page2 += text(48, y - 34 - index * 21, 12, item, '0.38 0.41 0.48')
page2 += line(48, 98, 547, 98) + text(48, 76, 9, 'Studio notes / A place to begin') + text(530, 76, 9, '02')

page3 = rect(0, 0, 595, 842, '0.99 0.99 0.985')
page3 += text(48, 782, 14, 'fieldwork', font='F2') + text(482, 783, 9, 'YOUR TURN') + line(48, 764, 547, 764)
page3 += text(48, 683, 42, 'What comes next?', font='F2')
page3 += text(48, 641, 15, 'A little space for your next good idea.', font='F3')
for y in range(554, 155, -36):
    page3 += line(48, y, 547, y, '0.88 0.89 0.92')
page3 += line(48, 98, 547, 98) + text(48, 76, 9, 'Studio notes / Make it yours') + text(530, 76, 9, '03')

pages = []
for content in [cover, page2, page3]:
    encoded = content.encode('latin1')
    stream = obj(f'<< /Length {len(encoded)} >>\nstream\n{content}endstream')
    page = obj(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 {font1} 0 R /F2 {font2} 0 R /F3 {font3} 0 R >> >> /Contents {stream} 0 R >>')
    pages.append(page)
objects[1] = f'<< /Type /Pages /Count 3 /Kids [{" ".join(f"{p} 0 R" for p in pages)}] >>'.encode()
data = bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
offsets = [0]
for index, value in enumerate(objects, 1):
    offsets.append(len(data))
    data.extend(f'{index} 0 obj\n'.encode() + value + b'\nendobj\n')
xref = len(data)
data.extend(f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode())
for offset in offsets[1:]:
    data.extend(f'{offset:010d} 00000 n \n'.encode())
data.extend(f'trailer\n<< /Size {len(offsets)} /Root {catalog} 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
Path('src/assets/studio-notes.pdf').write_bytes(data)
print(f'Created sample PDF: {len(data)} bytes, 3 pages')
