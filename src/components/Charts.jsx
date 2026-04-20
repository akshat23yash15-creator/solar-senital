import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: "rgba(255,255,255,0.72)" },
    },
    tooltip: {
      backgroundColor: "rgba(10,12,25,0.92)",
      borderColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      titleColor: "rgba(255,255,255,0.86)",
      bodyColor: "rgba(255,255,255,0.76)",
    },
  },
  scales: {
    x: {
      ticks: { color: "rgba(255,255,255,0.55)" },
      grid: { color: "rgba(255,255,255,0.06)" },
    },
    y: {
      ticks: { color: "rgba(255,255,255,0.55)" },
      grid: { color: "rgba(255,255,255,0.06)" },
    },
  },
};

export function SolarWindLine({ labels, values }) {
  const data = {
    labels,
    datasets: [
      {
        label: "Solar wind speed (km/s)",
        data: values,
        borderColor: "rgba(34,211,238,0.9)",
        backgroundColor: "rgba(34,211,238,0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 2.5,
      },
    ],
  };
  return <Line options={baseOptions} data={data} />;
}

export function KpBar({ labels, values }) {
  const data = {
    labels,
    datasets: [
      {
        label: "Kp index",
        data: values,
        backgroundColor: "rgba(124,58,237,0.55)",
        borderColor: "rgba(124,58,237,0.9)",
        borderWidth: 1,
      },
    ],
  };
  const options = {
    ...baseOptions,
    scales: {
      ...baseOptions.scales,
      y: { ...baseOptions.scales.y, suggestedMax: 9 },
    },
  };
  return <Bar options={options} data={data} />;
}

export function RiskPie({ labels, values }) {
  const data = {
    labels,
    datasets: [
      {
        label: "Distribution",
        data: values,
        backgroundColor: [
          "rgba(53,242,140,0.7)",
          "rgba(255,191,31,0.7)",
          "rgba(255,59,59,0.7)",
        ],
        borderColor: [
          "rgba(53,242,140,1)",
          "rgba(255,191,31,1)",
          "rgba(255,59,59,1)",
        ],
        borderWidth: 1,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "rgba(255,255,255,0.72)" },
      },
      tooltip: baseOptions.plugins.tooltip,
    },
  };
  return <Pie options={options} data={data} />;
}

export function RiskBar({ names, scores }) {
  const data = {
    labels: names,
    datasets: [
      {
        label: "Risk score",
        data: scores,
        backgroundColor: scores.map((s) =>
          s >= 70
            ? "rgba(255,59,59,0.65)"
            : s >= 50
              ? "rgba(255,191,31,0.55)"
              : "rgba(53,242,140,0.4)",
        ),
        borderColor: scores.map((s) =>
          s >= 70
            ? "rgba(255,59,59,1)"
            : s >= 50
              ? "rgba(255,191,31,1)"
              : "rgba(53,242,140,1)",
        ),
        borderWidth: 1,
      },
    ],
  };
  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { display: false },
    },
    scales: {
      ...baseOptions.scales,
      y: { ...baseOptions.scales.y, suggestedMax: 100 },
    },
  };
  return <Bar options={options} data={data} />;
}
