import "@angular/compiler";
import {
  Component,
  ElementRef,
  inject,
  createComponent,
  provideZonelessChangeDetection,
} from "@angular/core";
import { createApplication } from "@angular/platform-browser";
import { createElement, useLayoutEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { FieldControlProps } from "@ourform/sdk";
import * as vnode from "./vnode";
import * as vnodeControls from "./vnode-controls";
import * as dom from "./dom-controls";
type P = FieldControlProps<
  string | number | null,
  { max: number; allowHalf: boolean }
>;
interface Mounted {
  el: HTMLElement;
  update(p: P): void;
  destroy(): void;
}
type Candidate = "vnode" | "dom";
function props(
  index: number,
  update: (v: string | number | null) => void = () => {},
): P {
  return {
    value: index % 2 ? "" : null,
    setValue: update,
    onBlur: () => {},
    config: { max: 5, allowHalf: false },
    state: {
      disabled: false,
      readOnly: false,
      invalid: false,
      pending: false,
      required: false,
    },
    a11y: { id: `f${index}`, name: `Field ${index}`, labelledBy: `l${index}` },
    focusRef: () => {},
    theme: { classFor: () => "base" },
    t: (key) => key,
  };
}
function mount(candidate: Candidate, index: number, p: P): Mounted {
  const isText = index % 2 === 1;
  if (candidate === "dom") {
    const unit = isText
      ? dom.text(p as Parameters<typeof dom.text>[0])
      : dom.rating(p as Parameters<typeof dom.rating>[0]);
    return unit as Mounted;
  }
  const render = (value: P) =>
    isText
      ? vnodeControls.text(value as Parameters<typeof vnodeControls.text>[0])
      : vnodeControls.rating(
          value as Parameters<typeof vnodeControls.rating>[0],
        );
  const unit = vnode.mount(render(p));
  return {
    el: unit.el,
    update: (p) => unit.update(render(p)),
    destroy: () => unit.destroy(),
  };
}
function median(values: number[]): number {
  return values.sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
}
async function performanceRun(candidate: Candidate) {
  const root = document.querySelector("#fields")!;
  const mounts: number[] = [],
    updates: number[] = [],
    themes: number[] = [];
  for (let round = 0; round < 12; round++) {
    const start = performance.now();
    const units = Array.from({ length: 500 }, (_, i) => {
      const p = props(i);
      const unit = mount(candidate, i, p);
      root.append(unit.el);
      return { p, unit };
    });
    root.getBoundingClientRect();
    const mounted = performance.now() - start;
    const input = units[1]!;
    input.unit.el.focus();
    const original = input.unit.el;
    const before = performance.now();
    for (let i = 0; i < 200; i++)
      input.unit.update({ ...input.p, value: `value ${i}` });
    const updated = (performance.now() - before) / 200;
    const theme = performance.now();
    for (const item of units)
      item.unit.update({ ...item.p, theme: { classFor: () => "alternate" } });
    root.getBoundingClientRect();
    const themed = performance.now() - theme;
    if (document.activeElement !== original)
      throw new Error("Focused control was replaced.");
    units.forEach((item) => item.unit.destroy());
    if (root.children.length) throw new Error("Leaked elements.");
    if (round >= 2) {
      mounts.push(mounted);
      updates.push(updated);
      themes.push(themed);
    }
    await new Promise(requestAnimationFrame);
  }
  return {
    mountMs: median(mounts),
    keystrokeMs: median(updates),
    themeMs: median(themes),
    samples: { mounts, updates, themes },
  };
}
function PortableHost({ candidate, p }: { candidate: Candidate; p: P }) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef<Mounted | null>(null);
  useLayoutEffect(() => {
    mounted.current = mount(candidate, 1, p);
    ref.current!.append(mounted.current.el);
    return () => {
      mounted.current!.destroy();
      mounted.current = null;
    };
  }, [candidate]);
  useLayoutEffect(() => {
    mounted.current?.update(p);
  }, [p]);
  return createElement("div", { ref });
}
class AngularProbe {
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  candidate: Candidate = "vnode";
  p = props(1);
  unit: Mounted | null = null;
  ngAfterViewInit() {
    this.unit = mount(this.candidate, 1, this.p);
    this.host.nativeElement.append(this.unit.el);
  }
  update(p: P) {
    this.p = p;
    this.unit!.update(p);
  }
  ngOnDestroy() {
    this.unit?.destroy();
  }
}
Component({ selector: "comparison-probe", standalone: true, template: "" })(
  AngularProbe,
);
async function hosts(candidate: Candidate) {
  const root = document.querySelector("#hosts") as HTMLElement;
  let changes = 0;
  const p = { ...props(1, () => changes++), value: "before" };
  const reactHost = document.createElement("div");
  root.append(reactHost);
  const reactRoot = createRoot(reactHost);
  const reactStart = performance.now();
  flushSync(() =>
    reactRoot.render(createElement(PortableHost, { candidate, p })),
  );
  flushSync(() =>
    reactRoot.render(
      createElement(PortableHost, { candidate, p: { ...p, value: "after" } }),
    ),
  );
  const reactInput = reactHost.querySelector("input")!;
  reactInput.dispatchEvent(new Event("input", { bubbles: true }));
  const reactMs = performance.now() - reactStart;
  if (reactInput.value !== "after") throw new Error("React update failed.");
  reactRoot.unmount();
  if (reactHost.querySelector("input")) throw new Error("React leak.");
  reactHost.remove();
  const app = await createApplication({
    providers: [provideZonelessChangeDetection()],
  });
  const angularHost = document.createElement("div");
  root.append(angularHost);
  const angularStart = performance.now();
  const ref = createComponent(AngularProbe, {
    hostElement: angularHost,
    environmentInjector: app.injector,
  });
  ref.instance.candidate = candidate;
  ref.instance.p = p;
  app.attachView(ref.hostView);
  ref.changeDetectorRef.detectChanges();
  ref.instance.update({ ...p, value: "after" });
  const angularInput = angularHost.querySelector("input")!;
  angularInput.dispatchEvent(new Event("input", { bubbles: true }));
  const angularMs = performance.now() - angularStart;
  if (angularInput.value !== "after") throw new Error("Angular update failed.");
  ref.destroy();
  app.destroy();
  if (angularHost.querySelector("input")) throw new Error("Angular leak.");
  angularHost.remove();
  if (changes !== 2) throw new Error("Host event failed.");
  return {
    reactMs,
    angularMs,
    react: true,
    angular: true,
    changeCallbacks: changes,
  };
}
declare global {
  interface Window {
    runComparison: () => Promise<unknown>;
  }
}
window.runComparison = async () => {
  const result: Record<string, unknown> = {};
  for (const candidate of ["dom", "vnode"] as const) {
    const performance = await performanceRun(candidate);
    const host = await hosts(candidate);
    const text = props(1);
    const rating = props(0);
    const ssr =
      candidate === "dom"
        ? dom.ssrText(text as Parameters<typeof dom.ssrText>[0]) +
          dom.ssrRating(rating as Parameters<typeof dom.ssrRating>[0])
        : vnode.ssr(
            vnodeControls.text(
              text as Parameters<typeof vnodeControls.text>[0],
            ),
          ) +
          vnode.ssr(
            vnodeControls.rating(
              rating as Parameters<typeof vnodeControls.rating>[0],
            ),
          );
    const ssrStart = performance.now();
    for (let i = 0; i < 500; i++) {
      if (candidate === "dom") {
        dom.ssrText(text as Parameters<typeof dom.ssrText>[0]);
        dom.ssrRating(rating as Parameters<typeof dom.ssrRating>[0]);
      } else {
        vnode.ssr(
          vnodeControls.text(text as Parameters<typeof vnodeControls.text>[0]),
        );
        vnode.ssr(
          vnodeControls.rating(
            rating as Parameters<typeof vnodeControls.rating>[0],
          ),
        );
      }
    }
    result[candidate] = {
      ssrPairMs: (performance.now() - ssrStart) / 500,
      ...performance,
      hosts: host,
      ssr,
      ssrBytes: new TextEncoder().encode(ssr).length,
    };
  }
  return result;
};
