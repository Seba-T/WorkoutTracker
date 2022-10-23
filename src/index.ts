import { Notion } from "./notion.js";
// Initializing a client

const MONGODB_URL = `mongodb+srv://${process.env.MONGODB_USR}:${process.env.MONGODB_PW}${process.env.MONGODB_URL}`;

const notion = new Notion(
  process.env.NOTION_TOKEN as string,
  process.env.PAGE_ID as string,
  MONGODB_URL
);

try {
  await notion.syncUpdates();
  console.log("Successfully synched updates, exiting with code 0...");
  process.exit(0);
} catch (e) {
  throw e;
}
