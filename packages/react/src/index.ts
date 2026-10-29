import {
  createContext,
  createElement,
  forwardRef,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentType, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { createEngine, parsePath } from "@ourform/core";
import type { Engine, FieldState } from "@ourform/core";
import { createFormController } from "@ourform/renderer-dom";
import type {
  FormController,
  HostOptions,
  NativeHost,
} from "@ourform/renderer-dom";
import { registerNativeField, mapNativeProps } from "@ourform/sdk";
import type {
  NativeFieldOptions,
  NativeRegistrationArgs,
  RegisteredField,
} from "@ourform/sdk";
import { builtinComponents } from "@ourform/components";
import { createBuilderController } from "@ourform/builder";
import type { BuilderController, BuilderOptions } from "@ourform/builder";
export type {
  BuilderController,
  BuilderOptions,
  SchemaChange,
} from "@ourform/builder";
const emptyFields: readonly RegisteredField[] = [];
const Environment = createContext<{
  engine?: Engine;
  fields?: readonly RegisteredField[];
}>({});
const Session = createContext<FormController | null>(null);
export function OurFormProvider(props: {
  engine?: Engine;
  fields?: readonly RegisteredField[];
  children?: ReactNode;
}) {
  const engine = useMemo(() => props.engine ?? createEngine(), [props.engine]);
  const value = useMemo(
    () => ({ engine, fields: props.fields ?? emptyFields }),
    [engine, props.fields],
  );
  return createElement(Environment.Provider, { value }, props.children);
}
export function registerReactField<P extends object>(
  type: string,
  component: ComponentType<P>,
  ...args: NativeRegistrationArgs<P extends { value?: infer V } ? V : string>
): RegisteredField {
  return registerNativeField<unknown>(
    "react",
    type,
    component,
    args[0] as NativeFieldOptions<unknown> | undefined,
  );
}
export interface FormProps extends Omit<HostOptions, "adapter" | "nativeHost"> {
  children?: ReactNode;
  className?: string;
  onReady?: (controller: FormController) => void;
}
interface Portal {
  key: string;
  slot: HTMLElement;
  node: ReactNode;
}
export const Form = forwardRef<FormController, FormProps>(
  function Form(props, ref) {
    const environment = useContext(Environment);
    const container = useRef<HTMLDivElement>(null);
    const controller = useRef<FormController | null>(null);
    const preserved = useRef<unknown>(undefined);
    const current = useRef(props);
    current.current = props;
    const [handle, setHandle] = useState<FormController | null>(null);
    const [portals, setPortals] = useState<ReadonlyMap<HTMLElement, Portal>>(
      new Map(),
    );
    const fields = props.fields ?? environment.fields ?? emptyFields;
    const engine = props.engine ?? environment.engine;
    useImperativeHandle(ref, () => handle!, [handle]);
    useLayoutEffect(() => {
      let active = true;
      const makeNativeHost = (
        owner: FormController | null = null,
      ): NativeHost => ({
        forController: (controller) => makeNativeHost(controller),
        mount(slot, view, initial) {
          const publish = (p: typeof initial) => {
            if (!active) return;
            setPortals((before) => {
              const next = new Map(before);
              next.set(slot, {
                key: p.a11y.id,
                slot,
                node: createElement(
                  Session.Provider,
                  { value: owner },
                  createElement(
                    view.component as ComponentType<Record<string, unknown>>,
                    mapNativeProps(view, p),
                  ),
                ),
              });
              return next;
            });
          };
          publish(initial);
          return {
            update: publish,
            destroy() {
              if (active)
                setPortals((before) => {
                  const next = new Map(before);
                  next.delete(slot);
                  return next;
                });
            },
          };
        },
      });
      const nativeHost = makeNativeHost();
      const next = createFormController(container.current!, {
        ...current.current,
        data:
          current.current.data ??
          preserved.current ??
          current.current.defaultData ??
          {},
        ...(engine ? { engine } : {}),
        fields: [...builtinComponents, ...fields],
        adapter: "react",
        nativeHost,
        onChange: (patch) => current.current.onChange?.(patch),
        onSubmit: (result) => current.current.onSubmit?.(result),
        onAction: (event) => current.current.onAction?.(event),
      });
      controller.current = next;
      setHandle(next);
      current.current.onReady?.(next);
      return () => {
        active = false;
        preserved.current = next.session.getData();
        next.destroy();
        controller.current = null;
        setPortals(new Map());
        setHandle(null);
      };
    }, [props.schema, engine, fields, props.readOnly]);
    useLayoutEffect(() => {
      if (props.data !== undefined) controller.current?.setData(props.data);
    }, [props.data, handle]);
    useLayoutEffect(() => {
      controller.current?.view.setThemes(props.themes, props.theme ?? "base");
    }, [props.theme, props.themes, handle]);
    useLayoutEffect(() => {
      controller.current?.view.setMode(props.themeMode ?? "light");
    }, [props.themeMode, handle]);
    return createElement(
      Session.Provider,
      { value: handle },
      createElement("div", { ref: container, className: props.className }),
      [...portals.values()].map((p) => createPortal(p.node, p.slot, p.key)),
      props.children,
    );
  },
);
export function useForm(
  ref?: RefObject<FormController | null>,
): FormController | null {
  const context = useContext(Session);
  return ref ? ref.current : context;
}
export function useField(path: string): FieldState | null {
  const form = useContext(Session);
  const parsed = useMemo(() => parsePath(path), [path]);
  const subscribe = useMemo(
    () => (listener: () => void) =>
      form ? form.session.subscribe(listener) : () => {},
    [form],
  );
  const snapshot = useMemo(
    () => () => {
      const node = form?.session.form.nodes.find(
        (entry) =>
          entry.model.value &&
          entry.path.every((segment, i) => segment === parsed[i]) &&
          entry.path.length === parsed.length,
      );
      return node && form ? form.session.getFieldState(node.node.id) : null;
    },
    [form, parsed],
  );
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
export interface FormBuilderProps extends BuilderOptions {
  className?: string;
  onReady?: (controller: BuilderController) => void;
}
/** Schema echoes are no-ops; changed schemas load through the same atomic command as JSON import. */
export const FormBuilder = forwardRef<BuilderController, FormBuilderProps>(
  function FormBuilder(props, ref) {
    const environment = useContext(Environment);
    const container = useRef<HTMLDivElement>(null);
    const current = useRef(props);
    current.current = props;
    const controller = useRef<BuilderController | null>(null);
    const loadedSchema = useRef(props.schema);
    const [handle, setHandle] = useState<BuilderController | null>(null);
    const [preview, setPreview] = useState<FormController | null>(null);
    const [portals, setPortals] = useState<ReadonlyMap<HTMLElement, Portal>>(
      new Map(),
    );
    const fields = useMemo(
      () => [
        ...(environment.fields ?? emptyFields),
        ...(props.fields ?? emptyFields),
      ],
      [environment.fields, props.fields],
    );
    const engine = props.engine ?? environment.engine;
    useImperativeHandle(ref, () => handle as BuilderController, [handle]);
    useLayoutEffect(() => {
      let active = true;
      const makeNativeHost = (
        owner: FormController | null = null,
      ): NativeHost => ({
        forController: (controller) => makeNativeHost(controller),
        mount(slot, view, initial) {
          const publish = (p: typeof initial) => {
            if (!active) return;
            setPortals((before) => {
              const next = new Map(before);
              next.set(slot, {
                key: p.a11y.id,
                slot,
                node: createElement(
                  Session.Provider,
                  { value: owner },
                  createElement(
                    view.component as ComponentType<Record<string, unknown>>,
                    mapNativeProps(view, p),
                  ),
                ),
              });
              return next;
            });
          };
          publish(initial);
          return {
            update: publish,
            destroy() {
              if (active)
                setPortals((before) => {
                  const next = new Map(before);
                  next.delete(slot);
                  return next;
                });
            },
          };
        },
      });
      const nativeHost = makeNativeHost();
      const next = createBuilderController(container.current!, {
        ...current.current,
        ...(engine ? { engine } : {}),
        fields: [...builtinComponents, ...fields],
        adapter: "react",
        nativeHost,
        onSchemaChange: (change) => current.current.onSchemaChange?.(change),
        onPreviewReady: (form) => {
          if (active) {
            setPreview(form ?? null);
            current.current.onPreviewReady?.(form);
          }
        },
        onSubmit: (result) => current.current.onSubmit?.(result),
      });
      controller.current = next;
      loadedSchema.current = current.current.schema;
      setHandle(next);
      current.current.onReady?.(next);
      return () => {
        active = false;
        next.destroy();
        controller.current = null;
        setHandle(null);
        setPreview(null);
        setPortals(new Map());
      };
    }, [
      engine,
      fields,
      props.assetBase,
      props.preload,
      props.settingsPreload,
      props.planningPreload,
      props.dataPreload,
      props.styleNonce,
      props.themes,
      props.builderThemes,
      props.lazyThemes,
    ]);
    useLayoutEffect(() => {
      if (props.schema !== loadedSchema.current) {
        controller.current?.load(props.schema);
        loadedSchema.current = props.schema;
      }
    }, [props.schema, handle]);
    useLayoutEffect(() => {
      controller.current?.setTheme(props.theme ?? "base");
    }, [props.theme, handle]);
    useLayoutEffect(() => {
      controller.current?.setMode(props.themeMode ?? "light");
    }, [props.themeMode, handle]);
    useLayoutEffect(() => {
      controller.current?.setChrome(props.chrome ?? {});
    }, [props.chrome, handle]);
    return createElement(
      Session.Provider,
      { value: preview },
      createElement("div", { ref: container, className: props.className }),
      [...portals.values()].map((portal) =>
        createPortal(portal.node, portal.slot, portal.key),
      ),
    );
  },
);
