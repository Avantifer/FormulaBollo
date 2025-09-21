export interface ChartData {
  labels: string[];
  datasets: {
    backgroundColor: string[];
    data: number[];
  }[];
}