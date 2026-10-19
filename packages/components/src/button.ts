import { defineDisplay, h, stringProperty, selectProperty } from "@ourform/sdk";
export const buttonField = defineDisplay({
  type: "button",
  title: "Button",
  properties: {
    action: selectProperty({
      label: "of.button.action",
      default: "submit",
      options: [
        { value: "submit", label: "of.button.submit" },
        { value: "reset", label: "of.button.reset" },
        { value: "custom", label: "of.button.custom" },
      ],
    }),
    text: stringProperty({ label: "of.button.label", default: "" }),
    event: stringProperty({ label: "of.button.event", default: "action" }),
  },
  control: (p) =>
    h(
      "button",
      {
        type: "button",
        class: p.theme.classFor("control"),
        disabled: p.state.disabled || p.state.readOnly,
        onclick: () => {
          if (p.state.disabled || p.state.readOnly) return;
          if (p.config.action === "submit") p.actions?.submit();
          else if (p.config.action === "reset") p.actions?.reset();
          else p.actions?.emit(p.config.event);
        },
        ref: (element: HTMLElement | null) => p.focusRef(element),
      },
      p.config.text || p.t(`of.button.${p.config.action}`),
    ),
});
