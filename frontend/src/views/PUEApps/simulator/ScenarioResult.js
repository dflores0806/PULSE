import React from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, ChartDataLabels)

const ScenarioResult = ({ currentPUE, simulatedPUE }) => {
  const data = {
    labels: ['Current PUE', 'Simulated PUE'],
    datasets: [
      {
        label: 'PUE',
        data: [currentPUE ?? 0, simulatedPUE ?? 0],
        backgroundColor: ['#2ecc71', '#3498db'],
        borderRadius: 4,
        barThickness: 30,
        datalabels: {
          anchor: 'center',
          align: 'right',
          color: '#FFF',
          formatter: value => value.toFixed(2)
        }
      }
    ]
  }

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'PUE comparison',
        font: { size: 16 }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 3,
        ticks: { stepSize: 0.5 }
      }
    }
  }

  return (
    <div className="my-4" style={{ height: '160px' }}>
      <Bar data={data} options={options} height={160} />
    </div>
  )
}

export default ScenarioResult
