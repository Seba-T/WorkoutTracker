import { Mongoose } from "mongoose";
import { CachedData } from "./notion";
const caFileBuf = "./security/mongo.cer";

export type Measurement = { date: Date; value: number };

export class MongoUtils {
  private _mongoose: Mongoose;
  private _ExerciseData;
  private _PageIdsCachedData;
  private _StrikeRecord;
  public Ready: Promise<boolean>;

  constructor(mongodbUrl: string) {
    this._mongoose = new Mongoose();
    const mongoMeasurement = new this._mongoose.Schema({
      date: Date,
      value: Number,
    });
    const exerciseData = new this._mongoose.Schema({
      page_id: { type: String, required: true },
      description: { type: String, required: true },
      measurements: { type: [mongoMeasurement], required: true },
      lastUpdatedDate: { type: Date, required: true },
    });
    const pageIdsCachedData = new this._mongoose.Schema({
      date: { type: Date, required: true },
      pageIds: { type: Array<string>, required: true },
    });

    const strikeRecord = new this._mongoose.Schema({
      strikeDate: { type: Date, required: true },
    });

    this._StrikeRecord = this._mongoose.model("StrikeRecord", strikeRecord);

    this._ExerciseData = this._mongoose.model("ExerciseData", exerciseData);
    this._PageIdsCachedData = this._mongoose.model(
      "PageIdsCachedData",
      pageIdsCachedData
    );

    this.Ready = new Promise(async (resolve, reject) => {
      try {
        await this._mongoose.connect(mongodbUrl, {
          dbName: "Prod",
        });
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }
  /**
   * updateOrCreateExerciseData
   */
  public async saveStrikeRecord() {
    const strikeRecord = new this._StrikeRecord({ strikeDate: new Date() });
    strikeRecord.save();
  }

  public async updateOrCreateExerciseData(
    page_id: string,
    description: string,
    measurement: Measurement
  ): Promise<any> {
    page_id = page_id.trim();
    return this._ExerciseData
      .findOne({ page_id })
      .exec()
      .then(
        async (doc) => {
          if (doc === null) {
            //we insert a new record altogether
            const newRecord = new this._ExerciseData({
              description,
              page_id,
              measurements: [measurement],
              lastUpdatedDate: new Date(),
            });
            await newRecord.save({ j: true });
          } else {
            Object.assign(doc, { lastUpdatedDate: new Date(), isNew: false });
            doc.measurements.push(measurement);

            // console.log(doc.directModifiedPaths());
            await doc.save({ j: true });
            //we update the existing one
          }
          return true;
        },
        (err) => err
      );
  }

  /**
   * retrieveLatestMeasurement
   */
  public async retrieveLatestMeasurement(
    page_id: string
  ): Promise<number | undefined> {
    page_id = page_id.trim();
    return this._ExerciseData
      .findOne({ page_id })
      .exec()
      .then(
        (data) => {
          if (data !== null) {
            const lastElm = data.measurements.length - 1;
            return data.measurements[lastElm]?.value;
          } else return undefined;
        },
        (err) => err
      );
  }
  /**
   * retrieveCachedPageIds
   */
  public async retrieveCachedPageIds(): Promise<any> {
    return this._PageIdsCachedData
      .findOne()
      .exec()
      .then(
        (doc) => {
          if (doc !== null) {
            return { date: doc.date as Date, pageIds: doc.pageIds };
          } else return undefined;
        },
        (err) => err
      );
  }
  public async updateCachedData(cacheData: CachedData) {
    const newCache = new this._PageIdsCachedData(cacheData);
    newCache.save();
  }
  public async deleteOldCachedData() {
    return this._PageIdsCachedData.deleteMany().exec();
  }
}
