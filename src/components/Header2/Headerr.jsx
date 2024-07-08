import React from 'react'
import { RiMenu4Line } from 'react-icons/ri'
import { PiBell } from 'react-icons/pi'

const Headerr = () => {
  return (
    <div>
         {/* Header container */}
      <div className="flex my-7 justify-between px-3">
        <RiMenu4Line className="text-2xl" />

        {/* logo container */}
        <div className="text-xl font-semibold text-orange-500">LOGO</div>

        {/* notification icon */}
        <PiBell className="text-2xl" />
      </div>
    </div>
  )
}

export default Headerr