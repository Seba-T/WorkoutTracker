import { Mongoose } from "mongoose";
import { CachedData } from "./notion";
const caFileBuf = "./security/mongo.cer";

export type Measurement = { date: Date; value: number };

export class MongoUtils {
  private _mongoose: Mongoose;
  private _ExerciseData;
  private _PageIdsCachedData;
  public Ready: Promise<boolean>;

  constructor(mongodbUrl: string) {
    this._mongoose = new Mongoose();
    const mongoMeasurement = new this._mongoose.Schema({
      date: Date,
      value: Number,
    });
    const exerciseData = new this._mongoose.Schema({
      description: { type: String, required: true },
      measurements: { type: [mongoMeasurement], required: true },
      lastUpdatedDate: { type: Date, required: true },
    });
    const pageIdsCachedData = new this._mongoose.Schema({
      date: { type: Date, required: true },
      pageIds: { type: Array<string>, required: true },
    });

    this._ExerciseData = this._mongoose.model("ExerciseData", exerciseData);
    this._PageIdsCachedData = this._mongoose.model(
      "PageIdsCachedData",
      pageIdsCachedData
    );

    this.Ready = new Promise(async (resolve, reject) => {
      try {
        await this._mongoose.connect(mongodbUrl, {
          sslKey: caFileBuf,
          sslCert: caFileBuf,
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

  public getLastEditedDate(description: string): Promise<Date | undefined> {
    description = description.trim();
    return this._ExerciseData
      .findOne({ description })
      .exec()
      .then(
        (suc) => {
          if (suc !== null) return suc?.lastUpdatedDate;
          else return undefined;
        },
        (err) => err
      );
  }
  public async updateOrCreateExerciseData(
    description: string,
    measurement: Measurement
  ) {
    description = description.trim();
    this._ExerciseData.findOne(
      { description },
      (
        err: any,
        doc: {
          measurements: Array<Measurement>;
        }
      ) => {
        if (err) return err;
        if (doc === null) {
          //we insert a new record altogether
          const newRecord = new this._ExerciseData({
            description,
            measurements: [measurement],
            lastUpdatedDate: new Date(),
          });
          newRecord.save();
        } else {
          //we update the existing one
          this._ExerciseData.updateOne(
            { description },
            {
              measurements: doc.measurements.push(measurement),
              lastUpdatedDate: new Date(),
            }
          );
        }
      }
    );
  }

  /**
   * retrieveLatestMeasurement
   */
  public async retrieveLatestMeasurement(
    description: string
  ): Promise<number | undefined> {
    description = description.trim();
    return this._ExerciseData
      .findOne({ description })
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
