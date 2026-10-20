#!/usr/bin/env node
import { runCli } from "./index";
try {
  console.log(await runCli(process.argv.slice(2)));
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Scaffold generation failed.",
  );
  process.exitCode = 1;
}
