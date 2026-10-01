#!/usr/bin/env python3
"""Subset the OFL display fonts to only the glyphs used by the game.

usage: uvx --from fonttools --with brotli python scripts/subset-fonts.py <ZCOOLQingKeHuangYou.ttf> <MaShanZheng.ttf>
Fonts: ZCOOL QingKe HuangYou & Ma Shan Zheng (SIL Open Font License, Google Fonts).
"""
import pathlib, sys
from fontTools import subset

root = pathlib.Path(__file__).resolve().parent.parent
chars = set(chr(c) for c in range(0x20, 0x7F))
chars |= set('×÷∞·—…！？，。、：；（）【】「」《》“”‘’～')
for p in list((root / 'src').rglob('*.ts')) + [root / 'index.html']:
    for ch in p.read_text(encoding='utf-8'):
        if ord(ch) > 0x7F:
            chars.add(ch)
text = ''.join(sorted(chars))
print(f'{len(chars)} glyphs')

def run(src, out):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    out.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(out), opts)
    print(out, out.stat().st_size // 1024, 'KB')

run(sys.argv[1], root / 'public/fonts/ui.woff2')
run(sys.argv[2], root / 'public/fonts/title.woff2')
