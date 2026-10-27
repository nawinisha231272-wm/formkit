/** Instance-local author selection; schema and command history remain independent. */
export class SelectionSet {
  members: string[] = [];
  primary: string | null = null;
  anchor: string | null = null;

  select(id: string) {
    this.members = [id];
    this.primary = this.anchor = id;
  }

  toggle(id: string, fallback: string | null) {
    const index = this.members.indexOf(id);
    if (index < 0) {
      this.members.push(id);
      this.primary = id;
    } else {
      this.members.splice(index, 1);
      if (this.primary === id) this.primary = this.members.at(-1) ?? fallback;
    }
    this.anchor = id;
  }

  range(id: string, visible: readonly string[]) {
    const start = visible.indexOf(this.anchor ?? id);
    const end = visible.indexOf(id);
    if (start < 0 || end < 0) return;
    this.members = visible.slice(
      Math.min(start, end),
      Math.max(start, end) + 1,
    );
    this.primary = id;
  }

  snapshot() {
    return {
      members: [...this.members],
      primary: this.primary,
      anchor: this.anchor,
    };
  }

  restore(snapshot: ReturnType<SelectionSet["snapshot"]>) {
    this.members = [...snapshot.members];
    this.primary = snapshot.primary;
    this.anchor = snapshot.anchor;
  }

  retain(existing: ReadonlySet<string>) {
    this.members = this.members.filter((id) => existing.has(id));
    if (this.primary && !existing.has(this.primary))
      this.primary = this.members.at(-1) ?? null;
    if (this.anchor && !existing.has(this.anchor)) this.anchor = this.primary;
  }

  /** Structural operations omit descendants of selected ancestors in document order. */
  structural(order: readonly { id: string; parent?: string }[]) {
    const selected = new Set(this.members);
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
