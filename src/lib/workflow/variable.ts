import type { ExecutionContext } from "./types";

export type VariableContext = {
  outputs: Map<string, unknown>;
  inputs: Record<string, unknown>;
};

function resolveVariable(ref: string, ctx: VariableContext): unknown {
  const path = ref.replace(/[{}]/g, "").trim();
  const parts = path.split(".");

  if (parts[0] === "input") {
    let value: unknown = ctx.inputs;
    for (let i = 1; i < parts.length; i++) {
      value = (value as Record<string, unknown>)?.[parts[i]];
      if (value === undefined) break;
    }
    return value;
  }

  const nodeId = parts[0];
  const output = ctx.outputs.get(nodeId);
  if (!output) return undefined;

  let value: unknown = output;
  for (let i = 1; i < parts.length; i++) {
    value = (value as Record<string, unknown>)?.[parts[i]];
    if (value === undefined) break;
  }
  return value;
}

export function resolveVariablesInString(
  str: string,
  ctx: VariableContext
): string {
  if (!str) return str || "";
  return str.replace(/\{\{[^}]+\}\}/g, (match) => {
    const value = resolveVariable(match, ctx);
    if (value === undefined || value === null) return match;
    return typeof value === "string" ? value : JSON.stringify(value);
  });
}

export function resolveVariablesInObject(
  obj: Record<string, unknown>,
  ctx: VariableContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = resolveVariablesInString(value, ctx);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function evaluateCondition(
  expression: string,
  ctx: VariableContext
): boolean {
  const resolved = resolveVariablesInString(expression, ctx);
  try {
    return new Function(`return !!(${resolved})`)();
  } catch {
    return false;
  }
}
