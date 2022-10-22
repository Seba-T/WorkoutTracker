import { Notion } from "./notion.js";
// Initializing a client

const notion = new Notion(
  process.env.NOTION_TOKEN as string,
  process.env.PAGE_ID as string,
  process.env.MONGODB_URL as string
);

try {
  await notion.syncUpdates();
  console.log("Successfully synched updates, exiting with code 0...");
  process.exit(0);
} catch (e) {
  throw e;
}
