import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AmountSpentGraph = ({ data }) => {
  const formatYAxis = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
        <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12, fill: '#000', fontWeight: 'bold' }} />
        <Tooltip />
        <Bar dataKey="amount" fill="#f9531e" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AmountSpentGraph;
