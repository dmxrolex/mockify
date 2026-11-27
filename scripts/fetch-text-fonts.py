"""Fetch the editor's self-hosted Latin font files and their upstream licences."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import re
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent / 'assets' / 'fonts'
LICENCES = ROOT.parent.parent / 'public' / 'font-licenses'
FAMILIES = [('inter', 'Inter'), ('poppins', 'Poppins'), ('montserrat', 'Montserrat'),
            ('manrope', 'Manrope'), ('dmsans', 'DM Sans'), ('spacegrotesk', 'Space Grotesk'),
            ('nunito', 'Nunito'), ('plusjakartasans', 'Plus Jakarta Sans'),
            ('playfairdisplay', 'Playfair Display'), ('cormorantgaramond', 'Cormorant Garamond'),
            ('lora', 'Lora'), ('caveat', 'Caveat')]
HEADERS = {'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

def fetch(url):
    with urlopen(Request(url, headers=HEADERS), timeout=40) as response:
        return response.read()

def family(item):
    key, name = item
    css = fetch('https://fonts.googleapis.com/css2?family=' + quote(name + ':wght@400;600;700') + '&display=swap').decode('utf-8')
    faces = re.findall(r'/\* latin \*/\s*@font-face\s*\{(.*?)\}', css, re.S)
    if not faces:
        raise RuntimeError('No Latin WOFF2 faces for ' + name)
    for weight in (400, 600, 700):
        block = next(part for part in faces if re.search(r'font-weight:\s*' + str(weight) + r'\s*;', part))
        url = re.search(r'url\(([^)]+)\)', block).group(1)
        (ROOT / f'{key}-{weight}.woff2').write_bytes(fetch(url))
    licence=fetch(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{key}/OFL.txt')
    (ROOT / f'{key}-OFL.txt').write_bytes(licence)
    (LICENCES / f'{key}-OFL.txt').write_bytes(licence)
    return name

if __name__ == '__main__':
    ROOT.mkdir(parents=True, exist_ok=True)
    LICENCES.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        for name in pool.map(family, FAMILIES):
            print(name)
