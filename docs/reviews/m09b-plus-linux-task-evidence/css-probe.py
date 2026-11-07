from pathlib import Path
p=Path('/work/branch/packages/builder/dist/index.js')
s=p.read_text();Path('/evidence/original-builder.js').write_text(s)
a='for(let o=0;o<t.length;)i.rule.setProperty(t[o++],t[o++])'
assert s.count(a)==1
mode=__import__('sys').argv[1]
if mode=='guard':
 b='for(let o=0;o<t.length;){const e=t[o++],r=t[o++];i.rule.getPropertyValue(e)!==r&&i.rule.setProperty(e,r)}'
elif mode=='inline':
 b='for(let o=0;o<t.length;)e.style.setProperty(t[o++],t[o++])'
else: raise Exception(mode)
p.write_text(s.replace(a,b))
