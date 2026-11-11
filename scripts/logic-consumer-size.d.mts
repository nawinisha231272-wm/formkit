export interface FormConsumerSize {
  source: string;
  files: { file: string | undefined; raw: number; brotli: number }[];
  brotli: number;
  inputs: string[];
  includesLogicBody: boolean;
  includesRuleMetaSchema: boolean;
}
export const logicConsumerLimits: Readonly<{
  mainNoLogic: 28232;
  noLogic: 28832;
  increment: 6000;
  noLogicFull: 68500;
}>;
export function measureLogicConsumers(resolveDir?: string): Promise<{
  method: string;
  baselineSHA: string;
  limits: typeof logicConsumerLimits;
  noLogic: FormConsumerSize;
  enabled: FormConsumerSize;
  noLogicDelta: number;
  increment: number;
}>;
export function checkLogicConsumers(report: {
  noLogic: Pick<
    FormConsumerSize,
    "brotli" | "includesLogicBody" | "includesRuleMetaSchema"
  >;
  enabled: Pick<
    FormConsumerSize,
    "includesLogicBody" | "includesRuleMetaSchema"
  >;
  increment: number;
}): string[];
