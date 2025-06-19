// src/VendorTour.jsx
import React, { useState } from 'react'
import Joyride, { STATUS } from 'react-joyride'
import { steps } from '../../services/tourSteps'

export default function VendorTour() {
  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  const handleJoyrideCallback = (data) => {
    const { status, index, type } = data
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED]
    if (finishedStatuses.includes(status)) {
      setRun(false)
      setStepIndex(0)
    } else if (type === 'step:after') {
      setStepIndex(index + 1)
    }
  }

  return (
    <>
      <button onClick={() => setRun(true)}>
        Take the Vendor Tour
      </button>

      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        disableOverlayClose
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
          },
        }}
      />
    </>
  )
}
