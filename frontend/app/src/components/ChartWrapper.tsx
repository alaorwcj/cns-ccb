// src/components/ChartWrapper.tsx
import { Line } from "react-chartjs-2";
export function ChartWrapper({ data, options }: any) {
  return (
    <div className="w-full h-64 md:h-80 lg:h-96">
      <Line data={data} options={{ responsive: true, maintainAspectRatio: false, plugins:{ legend:{ position:"bottom" }}, ...options }} />
    </div>
  );
}