import React from 'react';
import { Doughnut } from 'react-chartjs-2';

const OrderChart = ({ fulfilled, unfulfilled, incoming }) => {
  const data = {
    labels: ['Fulfilled', 'Unfulfilled', 'Incoming'],
    datasets: [
      {
        data: [fulfilled, unfulfilled, incoming],
        backgroundColor: ['#FF00A9', '#FF5722', '#4CAF50'],
        hoverBackgroundColor: ['#FF4081', '#FF7043', '#66BB6A'],
      },
    ],
  };

  const options = {
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => `${tooltipItem.label}: ${tooltipItem.raw}`,
        },
      },
    },
  };

  return (
    <div className="relative w-48 h-48 mx-auto">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-sm font-semibold text-gray-600">Total Orders</p>
        <p className="text-2xl font-bold text-gray-800">
          {fulfilled + unfulfilled + incoming}
        </p>
      </div>
      <div className="flex justify-center mt-4 space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
          <span className="text-gray-600">Fulfilled ({fulfilled})</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
          <span className="text-gray-600">Unfulfilled ({unfulfilled})</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          <span className="text-gray-600">Incoming ({incoming})</span>
        </div>
      </div>
    </div>
  );
};

export default OrderChart;
