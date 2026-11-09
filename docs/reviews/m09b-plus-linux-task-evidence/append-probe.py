from pathlib import Path
b=Path('/work/branch/packages/builder/dist/index.js')
s=Path('/evidence/original-builder.js').read_text()
a='t.insertRule(`:is(#${o},.${o}){}`)'
assert s.count(a)==1
b.write_text(s.replace(a,'t.insertRule(`:is(#${o},.${o}){}`,t.cssRules.length)'))
r=Path('/work/branch/packages/renderer-dom/dist/index.js')
s=r.read_text();Path('/evidence/original-renderer.js').write_text(s)
a='sheet.insertRule(`.${className}{}`)'
assert s.count(a)==1
r.write_text(s.replace(a,'sheet.insertRule(`.${className}{}`, sheet.cssRules.length)'))
