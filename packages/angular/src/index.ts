import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EnvironmentInjector,
  EventEmitter,
  InjectionToken,
  Injector,
  Input,
  Output,
  createComponent,
  inject,
  makeEnvironmentProviders,
  reflectComponentType,
  signal,
} from "@angular/core";
import type {
  AfterViewInit,
  EnvironmentProviders,
  OnChanges,
  OnDestroy,
  Provider,
  SimpleChanges,
  Type,
  InputSignal,
} from "@angular/core";
import type { ControlValueAccessor } from "@angular/forms";
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
import type { StatePatch, SubmitResult } from "@ourform/core";
import { createBuilderController } from "@ourform/builder";
import type {
  BuilderController,
  BuilderOptions,
  SchemaChange,
} from "@ourform/builder";
import type { Diagnostic, FormDefinition } from "@ourform/schema";
export type {
  BuilderController,
  BuilderOptions,
  SchemaChange,
} from "@ourform/builder";
export const OUR_FORM_OPTIONS = new InjectionToken<Partial<HostOptions>>(
  "OurForm options",
);
export const OUR_FORM_FIELDS = new InjectionToken<readonly RegisteredField[]>(
  "OurForm fields",
);
export function provideOurForm(
  options: Partial<HostOptions> = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: OUR_FORM_OPTIONS, useValue: options },
  ]);
}
export function provideFormField<C>(
  type: string,
  component: Type<C>,
  ...args: NativeRegistrationArgs<
    C extends { value: infer V }
      ? V extends InputSignal<infer S>
        ? S
        : V
      : C extends { writeValue(value: infer V): void }
        ? V
        : string
  >
): Provider {
  return {
    provide: OUR_FORM_FIELDS,
    multi: true,
    useValue: registerNativeField<unknown>(
      "angular",
      type,
      component,
      args[0] as NativeFieldOptions<unknown> | undefined,
    ),
  };
}
export function createAngularNativeHost(
  environmentInjector: EnvironmentInjector,
  elementInjector: Injector,
  application: ApplicationRef,
): NativeHost {
  return {
    mount(slot, view, initial) {
      const component = view.component as Type<unknown>;
      const metadata = reflectComponentType(component);
      if (!metadata)
        throw new Error("Native Angular field must be an Angular component.");
      const ref = createComponent(component, {
        hostElement: slot,
        environmentInjector,
        elementInjector,
      });
      const instance = ref.instance as Record<string, unknown>;
      const cva = instance as unknown as Partial<ControlValueAccessor>;
      let props = initial;
      let destroyed = false;
      let written: unknown = Symbol("unwritten");
      let disabled: boolean | undefined;
      const subscriptions: { unsubscribe(): void }[] = [];
      const change = (...args: unknown[]) =>
        (
          mapNativeProps(view, props)[view.mapping.changeProp] as (
            ...values: unknown[]
          ) => void
        )(...args);
      const blur = () => props.onBlur();
      const accessor =
        typeof cva.writeValue === "function" &&
        typeof cva.registerOnChange === "function" &&
        typeof cva.registerOnTouched === "function";
      if (accessor) {
        cva.registerOnChange!(change);
        cva.registerOnTouched!(blur);
      }
      for (const output of metadata.outputs) {
        const source = instance[output.propName];
        if (
          source &&
          typeof source === "object" &&
          "subscribe" in source &&
          typeof source.subscribe === "function"
        ) {
          if (output.templateName === view.mapping.changeProp && !accessor)
            subscriptions.push(source.subscribe(change));
          if (output.templateName === view.mapping.blurProp)
            subscriptions.push(source.subscribe(blur));
        }
      }
      const captureBlur = () => {
        if (
          !metadata.outputs.some(
            (output) => output.templateName === view.mapping.blurProp,
          ) &&
          !accessor
        )
          blur();
      };
      slot.addEventListener("blur", captureBlur, true);
      application.attachView(ref.hostView);
      const hasReadOnly = metadata.inputs.some(
        (input) => input.templateName === view.mapping.readOnlyProp,
      );
      const update = (next: typeof props) => {
        if (destroyed) return;
        props = next;
        const mapped = mapNativeProps(view, props);
        if (accessor) {
          if (!Object.is(written, props.value)) {
            cva.writeValue!(props.value);
            written = props.value;
          }
          const effectiveDisabled =
            props.state.disabled || (props.state.readOnly && !hasReadOnly);
          if (disabled !== effectiveDisabled) {
            cva.setDisabledState?.(effectiveDisabled);
            disabled = effectiveDisabled;
          }
        }
        for (const input of metadata.inputs)
          if (
            Object.hasOwn(mapped, input.templateName) &&
            !(accessor && input.templateName === view.mapping.valueProp)
          )
            ref.setInput(input.templateName, mapped[input.templateName]);
        ref.changeDetectorRef.detectChanges();
        props.focusRef({
          focus: (options) =>
            slot
              .querySelector<HTMLElement>(
                "input:not(:disabled),button:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]",
              )
              ?.focus(options),
        });
      };
      update(initial);
      return {
        update,
        destroy() {
          if (destroyed) return;
          destroyed = true;
          subscriptions.forEach((subscription) => subscription.unsubscribe());
          slot.removeEventListener("blur", captureBlur, true);
          if (accessor) {
            cva.registerOnChange!(() => {});
            cva.registerOnTouched!(() => {});
          }
          props.focusRef(null);
          application.detachView(ref.hostView);
          ref.destroy();
        },
      };
    },
  };
}
@Component({
  selector: "our-form",
  standalone: true,
  template: '<div class="our-form-mount"></div><ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OurFormComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() schema: unknown;
  @Input() data: unknown;
  @Input() defaultData: unknown;
  @Input() theme: HostOptions["theme"];
  @Input() themeMode: HostOptions["themeMode"];
  @Input() readOnly: boolean | undefined;
  @Input() engine: HostOptions["engine"];
  @Input() fields: readonly RegisteredField[] = [];
  @Output() readonly dataChange = new EventEmitter<unknown>();
  @Output() readonly changed = new EventEmitter<StatePatch>();
  @Output() readonly submitted = new EventEmitter<SubmitResult>();
  @Output() readonly ready = new EventEmitter<FormController>();
  readonly #element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #environment = inject(EnvironmentInjector);
  readonly #injector = inject(Injector);
  readonly #application = inject(ApplicationRef);
  readonly #options = inject(OUR_FORM_OPTIONS, { optional: true }) ?? {};
  readonly #provided = inject(OUR_FORM_FIELDS, { optional: true }) ?? [];
  #mounted = false;
  readonly #controller = signal<FormController | undefined>(undefined);
  get controller(): FormController | undefined {
    return this.#controller();
  }
  ngAfterViewInit(): void {
    this.#mounted = true;
    this.rebuild();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.#mounted) return;
    if (
      ["schema", "engine", "fields", "readOnly"].some((key) => changes[key])
    ) {
      this.rebuild();
      return;
    }
    if (changes["data"] && this.data !== undefined)
      this.controller?.setData(this.data);
    if (changes["theme"])
      this.controller?.view.setTheme(
        this.theme ?? this.#options.theme ?? "base",
      );
    if (changes["themeMode"])
      this.controller?.view.setMode(
        this.themeMode ?? this.#options.themeMode ?? "light",
      );
  }
  private rebuild(): void {
    const previous = this.controller?.session.getData();
    this.controller?.destroy();
    if (!this.schema) return;
    this.#controller.set(
      createFormController(
        this.#element.nativeElement.querySelector(".our-form-mount")!,
        {
          ...this.#options,
          schema: this.schema,
          data:
            this.data ??
            previous ??
            this.defaultData ??
            this.#options.defaultData ??
            {},
          theme: this.theme ?? this.#options.theme ?? "base",
          themeMode: this.themeMode ?? this.#options.themeMode ?? "light",
          readOnly: this.readOnly ?? this.#options.readOnly ?? false,
          ...(this.engine ? { engine: this.engine } : {}),
          fields: [
            ...builtinComponents,
            ...(this.#options.fields ?? []),
            ...this.#provided,
            ...this.fields,
          ],
          adapter: "angular",
          nativeHost: createAngularNativeHost(
            this.#environment,
            this.#injector,
            this.#application,
          ),
          onChange: (patch) => {
            this.dataChange.emit(patch.data);
            this.changed.emit(patch);
          },
          onSubmit: (result) => this.submitted.emit(result),
        },
      ),
    );
    this.ready.emit(this.active());
  }
  private active(): FormController {
    if (!this.controller) throw new Error("Angular form is not ready.");
    return this.controller;
  }
  submit(): Promise<SubmitResult> {
    return this.active().submit();
  }
  validate(): ReturnType<FormController["validate"]> {
    return this.active().validate();
  }
  reset(data: unknown = {}): void {
    this.active().reset(data);
  }
  focusField(id: string): void {
    this.active().focusField(id);
  }
  ngOnDestroy(): void {
    this.controller?.destroy();
    this.#controller.set(undefined);
  }
}
@Component({
  selector: "our-form-builder",
  standalone: true,
  template: '<div class="our-builder-mount"></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OurFormBuilderComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() schema: unknown;
  @Input() theme: BuilderOptions["theme"];
  @Input() themeMode: BuilderOptions["themeMode"];
  @Input() engine: BuilderOptions["engine"];
  @Input() fields: readonly RegisteredField[] = [];
  @Output() readonly schemaChange = new EventEmitter<FormDefinition>();
  @Output() readonly changed = new EventEmitter<SchemaChange>();
  @Output() readonly diagnostics = new EventEmitter<readonly Diagnostic[]>();
  @Output() readonly ready = new EventEmitter<BuilderController>();
  readonly #element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #environment = inject(EnvironmentInjector);
  readonly #injector = inject(Injector);
  readonly #application = inject(ApplicationRef);
  readonly #options = inject(OUR_FORM_OPTIONS, { optional: true }) ?? {};
  readonly #provided = inject(OUR_FORM_FIELDS, { optional: true }) ?? [];
  readonly #controller = signal<BuilderController | undefined>(undefined);
  #mounted = false;
  get controller(): BuilderController | undefined {
    return this.#controller();
  }
  ngAfterViewInit(): void {
    this.#mounted = true;
    this.rebuild();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.#mounted) return;
    if (["engine", "fields"].some((key) => changes[key])) {
      this.rebuild();
      return;
    }
    if (changes["schema"] && this.schema !== undefined) {
      if (!this.controller) this.rebuild();
      else this.diagnostics.emit(this.controller.load(this.schema));
    }
    if (changes["theme"])
      this.controller?.setTheme(this.theme ?? this.#options.theme ?? "base");
    if (changes["themeMode"])
      this.controller?.setMode(
        this.themeMode ?? this.#options.themeMode ?? "light",
      );
  }
  private rebuild(): void {
    this.controller?.destroy();
    this.#controller.set(undefined);
    if (!this.schema) return;
    const next = createBuilderController(
      this.#element.nativeElement.querySelector(".our-builder-mount")!,
      {
        ...this.#options,
        schema: this.schema,
        theme: this.theme ?? this.#options.theme ?? "base",
        themeMode: this.themeMode ?? this.#options.themeMode ?? "light",
        ...(this.engine ? { engine: this.engine } : {}),
        fields: [
          ...builtinComponents,
          ...(this.#options.fields ?? []),
          ...this.#provided,
          ...this.fields,
        ],
        adapter: "angular",
        nativeHost: createAngularNativeHost(
          this.#environment,
          this.#injector,
          this.#application,
        ),
        onSchemaChange: (change) => {
          this.schemaChange.emit(change.definition);
          this.changed.emit(change);
        },
      },
    );
    this.#controller.set(next);
    this.ready.emit(next);
  }
  ngOnDestroy(): void {
    this.controller?.destroy();
    this.#controller.set(undefined);
  }
}
