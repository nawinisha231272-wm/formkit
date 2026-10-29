/** Instance-local author selection; schema and command history remain independent. */
export class SelectionSet {
  _ofbMembers: string[] = [];
  _ofbPrimary: string | null = null;
  _ofbAnchor: string | null = null;

  select(id: string) {
    this._ofbMembers = [id];
    this._ofbPrimary = this._ofbAnchor = id;
  }

  toggle(id: string, fallback: string | null) {
    const index = this._ofbMembers.indexOf(id);
    if (index < 0) {
      this._ofbMembers.push(id);
      this._ofbPrimary = id;
    } else {
      this._ofbMembers.splice(index, 1);
      if (this._ofbPrimary === id)
        this._ofbPrimary = this._ofbMembers.at(-1) ?? fallback;
    }
    this._ofbAnchor = id;
  }

  range(id: string, visible: readonly string[]) {
    const start = visible.indexOf(this._ofbAnchor ?? id);
    const end = visible.indexOf(id);
    if (start < 0 || end < 0) return;
    this._ofbMembers = visible.slice(
      Math.min(start, end),
      Math.max(start, end) + 1,
    );
    this._ofbPrimary = id;
  }

  snapshot() {
    return {
      members: [...this._ofbMembers],
      primary: this._ofbPrimary,
      anchor: this._ofbAnchor,
    };
  }

  restore(snapshot: ReturnType<SelectionSet["snapshot"]>) {
    this._ofbMembers = [...snapshot.members];
    this._ofbPrimary = snapshot.primary;
    this._ofbAnchor = snapshot.anchor;
  }

  retain(existing: ReadonlySet<string>) {
    this._ofbMembers = this._ofbMembers.filter((id) => existing.has(id));
    if (this._ofbPrimary && !existing.has(this._ofbPrimary))
      this._ofbPrimary = this._ofbMembers.at(-1) ?? null;
    if (this._ofbAnchor && !existing.has(this._ofbAnchor))
      this._ofbAnchor = this._ofbPrimary;
  }

  /** Structural operations omit descendants of selected ancestors in document order. */
  structural(order: readonly { id: string; parent?: string }[]) {
    const selected = new Set(this._ofbMembers);
    const parents = new Map(order.map((entry) => [entry.id, entry.parent]));
    return order
      .filter(({ id }) => {
        if (!selected.has(id)) return false;
        let parent = parents.get(id);
        while (parent) {
          if (selected.has(parent)) return false;
          parent = parents.get(parent);
        }
        return true;
      })
      .map(({ id }) => id);
  }
}
