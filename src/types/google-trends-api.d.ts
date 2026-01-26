declare module 'google-trends-api' {
  interface DailyTrendsOptions {
    geo?: string;
    trendDate?: Date;
    hl?: string;
  }

  interface InterestByRegionOptions {
    keyword: string | string[];
    geo?: string;
    resolution?: string;
    startTime?: Date;
    endTime?: Date;
  }

  interface InterestOverTimeOptions {
    keyword: string | string[];
    geo?: string;
    startTime?: Date;
    endTime?: Date;
    category?: number;
  }

  interface RelatedQueriesOptions {
    keyword: string | string[];
    geo?: string;
    startTime?: Date;
    endTime?: Date;
    category?: number;
  }

  function dailyTrends(options: DailyTrendsOptions): Promise<string>;
  function interestByRegion(options: InterestByRegionOptions): Promise<string>;
  function interestOverTime(options: InterestOverTimeOptions): Promise<string>;
  function relatedQueries(options: RelatedQueriesOptions): Promise<string>;

  export default {
    dailyTrends,
    interestByRegion,
    interestOverTime,
    relatedQueries,
  };
}
