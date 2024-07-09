import React from 'react';
import { useParams } from 'react-router-dom';

const MarketCardPage = () => {
  const { marketName } = useParams();

  return (
    <div className='p-2'>
      <h1 className='font-ubuntu text-xl flex justify-center'>{marketName}</h1>
     
    </div>
  );
};

export default MarketCardPage;
