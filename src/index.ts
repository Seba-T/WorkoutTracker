import { Notion } from "./notion.js";
// Initializing a client

const notion = new Notion(
  process.env.NOTION_TOKEN as string,
  process.env.PAGE_ID as string,
  process.env.MONGODB_URL as string
);

notion.Ready.then(() => {
  notion.syncUpdates();
});
