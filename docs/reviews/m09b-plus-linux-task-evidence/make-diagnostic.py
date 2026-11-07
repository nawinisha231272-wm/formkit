from pathlib import Path
arm=__import__('sys').argv[1]
p=Path('/work')/arm/'tests/e2e/builder-task.spec.ts'
s=p.read_text()
hook='''
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const counts: Record<string, { calls:number; ms:number; unchanged:number }> = {};
    (window as unknown as { profile: typeof counts }).profile = counts;
    function wrap(proto: object, key: string, same: (self: object, args: unknown[])=>boolean = ()=>false) {
      const target = proto as Record<string, (...args: unknown[])=>unknown>;
      const original=target[key]!;
      target[key]=function(...args: unknown[]) {
        const c=counts[key]??= {calls:0,ms:0,unchanged:0};
        c.calls++; if(same(this,args))c.unchanged++;
        const start=performance.now();
        try {return original.apply(this,args);} finally {c.ms+=performance.now()-start;}
      };
    }
    wrap(CSSStyleDeclaration.prototype,'setProperty',(self,args)=>(self as CSSStyleDeclaration).getPropertyValue(String(args[0]))===args[1]);
    wrap(CSSStyleSheet.prototype,'insertRule');
    wrap(Element.prototype,'getBoundingClientRect');
    wrap(Element.prototype,'setAttribute',(self,args)=>(self as Element).getAttribute(String(args[0]))===args[1]);
  });
});
'''
s=s.replace('for (const input',hook+'\nfor (const input',1)
s=s.replace('      const source = page.getByRole', '      const started=Date.now();\n      const source = page.getByRole',1)
s=s.replace('      return page.evaluate(','''      console.log('PHASE',JSON.stringify({input,label,ms:Date.now()-started,metrics:await page.evaluate(()=>({
        counters:(window as unknown as {profile:unknown}).profile,
        nodes:document.querySelectorAll('*').length,
        rules:[...document.styleSheets].map(s=>{try{return s.cssRules.length}catch{return -1}}),
      }))}));
      return page.evaluate(''',1)
p.with_name('builder-task-profile.spec.ts').write_text(s)
