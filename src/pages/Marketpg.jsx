import React from 'react'
import Market from '../components/Market/Market'
import { RiMenu4Line } from 'react-icons/ri'
import { FiSearch } from "react-icons/fi";


const Marketpg = () => {
  return (
    <div className='p-2'>

      {/* Header container */}
      <div className="flex translate-y-3 justify-between ">
        <RiMenu4Line className="text-2xl text-gray-500" />

        <h1 className='flex justify-center text-xl  font-medium text-center font-ubuntu text-black '>MARKETS</h1>
       
        {/* notification icon */}
        <FiSearch className=" text-2xl  text-gray-500" />
      </div>
     


    <div>
        <Market/>
    </div>
    </div>
  )
}

export default Marketpg

