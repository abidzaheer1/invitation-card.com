// Must be imported before anything else: configures the app for tests.
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

process.env.NODE_ENV = "test";
process.env.DISABLE_THROTTLE = "1";
process.env.JWT_SECRET = "test-secret";
process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
process.env.ROOT_DOMAIN = "invitation-card.com";
process.env.UPLOADS_DIR = mkdtempSync(join(tmpdir(), "invitation-uploads-"));
