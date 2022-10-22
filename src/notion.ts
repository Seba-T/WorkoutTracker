import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

import { comesAfter } from "./utils.js";

import {
  Client,
  isFullBlock,
  isFullPage,
  iteratePaginatedAPI,
} from "@notionhq/client";

import { MongoUtils } from "./mongodb.js";

export type CachedData = { date: Date; pageIds: Array<string> };

export type ExerciseDataObject = {
  description: string;
  measurement: number;
  id: string;
};

export class Notion {
  private _notion: Client;
  private _pageId: string;
  private _mongoUtils: MongoUtils;
  private _cachedPageIds!: CachedData;
  private _editedTime!: Date;
  public Ready: Promise<boolean>;
  /**
   *
   * @param token
   * @param pageId, it's the id of the main page
   *
   */

  constructor(token: string, pageId: string, mongoUrl: string) {
    this._notion = new Client({
      auth: token,
    });
    this._pageId = pageId;

    this._mongoUtils = new MongoUtils(mongoUrl);
    this.Ready = new Promise(async (resolve, reject) => {
      try {
        await this._mongoUtils.Ready;
        //we wait for mongodb to establish the connection
        await this.loadCache();
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * syncUpdates
   */

  public async syncUpdates() {
    const pages = await this.getAllPagesAsPageObject();
    const allAreChecked = this.checkIfAllAreChecked(pages);
    if (allAreChecked) this.uncheckAllCheckboxes();
    const pagesToUpdate = await this.getPagesToUpdate(pages);
    this.syncPagesToDb(pagesToUpdate);
    //this.updateAllModifiedDates(pagesToUpdate);
  }

  /**
   * ======================
   *
   * CACHING UTILS
   *
   * ======================
   */

  /**
   * update Cache
   */

  private async loadCache(): Promise<any> {
    const block = await this._notion.blocks.retrieve({
      block_id: this._pageId,
    });
    if (isFullBlock(block)) {
      this._editedTime = new Date(block.last_edited_time);

      const data = await this._mongoUtils.retrieveCachedPageIds();
      this._cachedPageIds =
        data !== undefined
          ? data
          : { date: new Date(), pageIds: new Array<string>() };

      if (comesAfter(this._editedTime, this._cachedPageIds.date)) {
        //we check that the caching is older than the latest update!
        const newCache: CachedData = {
          date: new Date(),
          pageIds: new Array<string>(),
        };

        newCache.pageIds.push(...(await this.getPageIds()));

        await this._mongoUtils.deleteOldCachedData();

        this._mongoUtils.updateCachedData(newCache);
        this._cachedPageIds = newCache;
      }
      return true;
    }
  }

  /**
   * ======================
   */

  /**
   * ======================
   *
   * SAVING TO DB UTILS
   *
   * ======================
   */

  /**
   *
   * @param pages
   */

  private async syncPagesToDb(pages: Array<ExerciseDataObject>) {
    for (const page of pages) {
      this._mongoUtils.updateOrCreateExerciseData(page.description, {
        date: new Date(),
        value: page.measurement,
      });
    }
  }

  /**
   * =========================
   */

  /**
   *
   * @param pages
   * @returns
   */

  private async getPagesToUpdate(pages: Array<PageObjectResponse>) {
    const pagesToUpdate = new Array<ExerciseDataObject>();
    for (const page of pages) {
      const props = this.getLightweightPage(page);

      this._mongoUtils
        .retrieveLatestMeasurement(props.description)
        .then((lastMeasurement) => {
          if (
            lastMeasurement !== undefined &&
            lastMeasurement !== 0 &&
            props.measurement !== lastMeasurement
          ) {
            pagesToUpdate.push(props);
          }
        });
    }

    return pagesToUpdate;
  }

  /**
   *
   * @param pages
   * @returns
   */

  private checkIfAllAreChecked(pages: Array<PageObjectResponse>): boolean {
    let allAreChecked = true;
    for (const page of pages) {
      if (page.properties.Status.type === "checkbox" && allAreChecked) {
        allAreChecked &&= page.properties.Status.checkbox;
      }
    }
    return allAreChecked;
  }
  /**
   * WARNING!! It unchecks all checkboxes
   */

  public async uncheckAllCheckboxes() {
    for (const id of this._cachedPageIds.pageIds) {
      this._notion.pages.update({
        page_id: id as string,
        properties: {
          Status: {
            checkbox: false,
          },
        },
      });
    }
  }

  /**
   *
   * @param pages
   */

  private updateAllModifiedDates(pages: Array<ExerciseDataObject>) {
    for (const page of pages) {
      this._notion.pages.update({
        page_id: page.id,
        properties: {
          "Last Modified": {
            date: { start: new Date().toISOString().split("T")[0] },
          },
        },
      });
    }
  }

  /**
   *
   * @param page
   * @returns
   */

  private getLightweightPage(page: PageObjectResponse): ExerciseDataObject {
    const description =
      page.properties.Title.type === "title"
        ? page.properties.Title.title[0].plain_text
        : "";
    const measurement =
      page.properties.Performances.type === "number"
        ? (page.properties.Performances.number as number)
        : 0;
    return { description, measurement, id: page.id };
  }

  /**
   * ======================
   *
   * NOTION UTILS
   *
   * ======================
   */

  /**
   * getPageIds
   *
   */
  private async getPageIds(): Promise<string[]> {
    const databases = new Array<string>();
    for await (const block of iteratePaginatedAPI(
      this._notion.blocks.children.list,
      {
        block_id: this._pageId,
      }
    )) {
      if (isFullBlock(block) && block.type === "child_database")
        databases.push(block.id);
    }
    const pageIds = new Array<string>();
    for (const dbId of databases) {
      const blocks = await this._notion.databases.query({
        database_id: dbId,
      });
      pageIds.push(...blocks.results.map((elm) => elm.id));
    }
    return pageIds;
  }

  /**
   *
   * @returns an array of PageObjectResponse
   * WARNING!!! this._cachedPageIds must be populated for this method to work properly
   */

  private async getAllPagesAsPageObject(): Promise<PageObjectResponse[]> {
    const result = new Array<PageObjectResponse>();
    for (const id of this._cachedPageIds.pageIds) {
      const page = await this._notion.pages.retrieve({ page_id: id as string });
      if (isFullPage(page)) result.push(page);
    }
    return result;
  }
  /**
   * ======================
   *
   * END OF NOTION UTILS
   *
   * ======================
   */
}
