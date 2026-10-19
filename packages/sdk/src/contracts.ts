export type ShellVariant = "field" | "group" | "inline" | "cell" | "none";
export interface FocusTarget {
  focus(options?: FocusOptions): void;
}
export interface FieldControlProps<V, C> {
  value: V;
  setValue(next: V): void;
  onBlur(): void;
  config: Readonly<C>;
  placeholder?: string;
  actions?: { submit(): void; reset(): void; emit(name: string): void };
  state: {
    disabled: boolean;
    readOnly: boolean;
    invalid: boolean;
    pending: boolean;
    required: boolean;
  };
  a11y: {
    id: string;
    name: string;
    labelledBy: string;
    describedBy?: string;
    errorId?: string;
  };
  focusRef(target: FocusTarget | null): void;
  theme: { classFor(part: string): string };
  t(key: string, params?: Record<string, unknown>): string;
}
