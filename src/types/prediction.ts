export interface TrajectoryPoint {
  date: string;
  forecast_day: number;
  lower_bound: number;
  upper_bound: number;
}

export interface PredictionData {
  prediction_generated_on: string;
  anchor_price: number;
  trajectory: TrajectoryPoint[];
}

export interface HistoricalDataPoint {
  date: string;
  value: number;
}
