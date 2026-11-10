export function verifyPreflight(options?: {
  platform?: string;
  read?: (args: string[]) => string;
  now?: () => string;
  log?: (message: string) => void;
  warn?: (message: string) => void;
}): void;
