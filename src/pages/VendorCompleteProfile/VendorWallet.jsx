import React from 'react'
import { FaAngleLeft } from 'react-icons/fa';


const VendorWallet = ({setShowWallet}) => {
    return (
        <div className="flex p-2 flex-col items-center font-ubuntu">
            <FaAngleLeft
                className="text-2xl text-black cursor-pointer self-start"
                onClick={() => setShowWallet(false)}
            />
            <h2 className="text-xl text-black font-ubuntu">Wallet</h2>
            <div className="w-full mt-4">
                <div className="flex flex-col items-center w-full">
                    <hr className="w-full border-gray-600" />
                    <div
                        className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
                    >
                        <p className="text-lg font-semibold text-black capitalize w-full">
                            Wallet
                        </p>
                    </div>
                    <hr className="w-full border-gray-600" />
                </div>
                <div className="flex flex-col items-center w-full mt-2">
                    <hr className="w-full border-gray-600" />
                    <div
                        className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
                    >
                        <p className="text-lg font-semibold text-black capitalize w-full">
                            Wallet
                        </p>
                    </div>
                    <hr className="w-full border-gray-600" />
                </div>
            </div>
        </div>
    )
}

export default VendorWallet