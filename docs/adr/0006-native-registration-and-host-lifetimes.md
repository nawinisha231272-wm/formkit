# ADR-0006 — Native registration and host lifetimes

Registration functions return immutable field descriptors. Hosts install descriptors alongside built-ins
into their own engine/view maps; no implicit global engine or native registry is introduced. A conventional
registration is `registerReactField('employee', EmployeeLookup)` or its Angular/element equivalent.
`registerNativeField(adapter, type, component, options)` provides common headless models and mappings.
Default inference is string; number/boolean/primitive-array inference uses explicit valueType. Object values
require a value adapter (enforced by typed wrappers and runtime value guards). Runtime types cannot be
inferred from erased TypeScript prop declarations; declarations must not promise otherwise.

Renderer view resolution is native for selected adapter, renderer-pack for that adapter, portable, then a
no-view error naming type/adapter. Resolution happens once per mounted field. A framework-neutral native
host owns an opaque control slot's contents and lifecycle; the keyed patcher owns only the slot/shell.
React owns native contents through portals in the host's React tree. Angular creates components with the
host EnvironmentInjector and element injector, attaches views and releases outputs/views on unmount.
CVA controls receive writeValue/registerOnChange/registerOnTouched/setDisabledState; conventional inputs
and outputs use the same mapping metadata. Optional supported state/ARIA inputs are passed through.

Adapters share a renderer-level host controller for compilation, session disposal, changed-path events,
controlled data diffs and submission integration. Adapters do not reimplement validation or form state.
Incoming controlled values update changed leaves only; event callbacks are current and echoed values
are no-ops. Schema/engine/registration changes replace the session with deliberate cleanup; theme/data
updates retain controls. Native DOM submits use the same result callback as imperative submit.

The element adapter uses light DOM by default, an opt-in shadow attribute and explicit configurable tag
registration. Registration itself is the only customElements side effect, and package imports are Node-safe.
Angular uses ng-packagr partial compilation and supports 21/22 with separate runtime conformance examples.
React targets 19; React 18 compatibility is deferred rather than assumed. Plugins remain their own later
milestone; M04 accepts field descriptors explicitly and does not implement plugin resolution early.
