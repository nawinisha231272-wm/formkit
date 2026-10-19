import type { InputSignal } from "@angular/core";
import type { provideFormField } from "@ourform/angular";
export function checkAngularRegistrationTypes(
  register: typeof provideFormField,
): void {
  class Conventional {
    value = "";
  }
  class SignalControl {
    declare value: InputSignal<string>;
  }
  class Accessor {
    writeValue(_value: string): void {}
  }
  class Complex {
    value: { id: string } | null = null;
  }
  register("string", Conventional);
  register("signal", SignalControl);
  register("accessor", Accessor);
  // @ts-expect-error object-valued Angular fields require a value adapter
  register("complex", Complex);
  register("complex", Complex, {
    value: {
      empty: () => null,
      normalize: () => null,
      isEmpty: (value) => value === null,
    },
  });
}
