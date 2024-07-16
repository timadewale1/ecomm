import React from 'react'
import Market from '../components/Market/Market'
import { RiMenu4Line } from 'react-icons/ri'
import { FiSearch } from "react-icons/fi";


const Marketpg = () => {
  return (
    <div className='p-2 '>

      {/* Header container */}
      <div className="flex translate-y-3 justify-center ">
        {/* <RiMenu4Line className="text-2xl text-gray-500" /> */}

        <h1 className=' text-lg  font-medium text-center font-ubuntu text-black '>MARKETS</h1>
       
        {/* notification icon */}
        {/* <FiSearch className=" text-2xl  text-gray-500" /> */}
      </div>
     


    <div className='mt-20'>
        <Market/>
    </div>
    </div>
  )
}

export default Marketpg

