export interface FormField {
  id: string;
  type: string;
  key: string;
  label: string;
  description?: string;
  defaultValue?: unknown;
  validation?: { required?: boolean };
  properties?: Record<string, unknown>;
}
export interface FormDefinition {
  $formVersion: "1.0";
  id: string;
  components: FormField[];
}
