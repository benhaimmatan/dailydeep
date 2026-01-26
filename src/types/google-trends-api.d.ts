declare module 'google-trends-api' {
  export interface DailyTrendsOptions {
    geo?: string;
    trendDate?: Date;
    hl?: string;
  }

  export interface InterestByRegionOptions {
    keyword: string | string[];
    geo?: string;
    resolution?: string;
    startTime?: Date;
    endTime?: Date;
  }

  export interface InterestOverTimeOptions {
    keyword: string | string[];
    geo?: string;
    startTime?: Date;
    endTime?: Date;
    category?: number;
  }

  export interface RelatedQueriesOptions {
    keyword: string | string[];
    geo?: string;
    startTime?: Date;
    endTime?: Date;
    category?: number;
  }

  export interface GoogleTrendsApi {
    dailyTrends(options: DailyTrendsOptions): Promise<string>;
    interestByRegion(options: InterestByRegionOptions): Promise<string>;
    interestOverTime(options: InterestOverTimeOptions): Promise<string>;
    relatedQueries(options: RelatedQueriesOptions): Promise<string>;
  }

  const googleTrends: GoogleTrendsApi;
  export default googleTrends;
}
