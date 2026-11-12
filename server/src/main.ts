#!/usr/bin/env bun
/**
 * Entry point of `setupvibe-server`.
 *
 * The edition must be registered before the core is evaluated, so it is
 * imported first; `run` lives in the shared core.
 */
import "./edition.ts";
import { run } from "../../shared/core/run.ts";

await run(process.argv.slice(2));
