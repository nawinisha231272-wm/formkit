export function orderGraph(
  ids: readonly string[],
  dependents: Readonly<Record<string, readonly string[]>>,
): { order: string[]; cycles: string[][] } {
  const degree = new Map(ids.map((id) => [id, 0]));
  for (const targets of Object.values(dependents))
    for (const target of targets) degree.set(target, degree.get(target)! + 1);
  const queue = ids.filter((id) => degree.get(id) === 0);
  const order: string[] = [];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!;
    order.push(id);
    for (const target of dependents[id] ?? []) {
      degree.set(target, degree.get(target)! - 1);
      if (degree.get(target) === 0) queue.push(target);
    }
  }
  const cycles: string[][] = [];
  const indices = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const active = new Set<string>();
  let index = 0;
  function visit(id: string): void {
    indices.set(id, index);
    low.set(id, index++);
    stack.push(id);
    active.add(id);
    for (const target of dependents[id] ?? []) {
      if (!indices.has(target)) {
        visit(target);
        low.set(id, Math.min(low.get(id)!, low.get(target)!));
      } else if (active.has(target))
        low.set(id, Math.min(low.get(id)!, indices.get(target)!));
    }
    if (low.get(id) === indices.get(id)) {
      const members: string[] = [];
      let member: string;
      do {
        member = stack.pop()!;
        active.delete(member);
        members.push(member);
      } while (member !== id);
      if (members.length > 1 || (dependents[id] ?? []).includes(id))
        cycles.push(members.sort());
    }
  }
  if (order.length !== ids.length)
    for (const id of ids) if (!indices.has(id)) visit(id);
  return { order, cycles };
}
