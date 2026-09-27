/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import fs from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
// The 3D kettle and the canvas effects use WebGL.
Config.setChromiumOpenGlRenderer("angle");

// Remotion normally downloads its own Chrome Headless Shell. In environments where
// that download is blocked, point it at a local build instead (optional).
const localBrowser =
  process.env.REMOTION_BROWSER_EXECUTABLE ??
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (fs.existsSync(localBrowser)) {
  Config.setBrowserExecutable(localBrowser);
}
