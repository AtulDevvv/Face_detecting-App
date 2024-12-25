import FaceDetection from '@/components/face-detection'

import React from 'react'

function page() {
  return (
    <div className='flex min-h-screen flex-col items-center p-8'>
      <div className='flex gap-5 relative items-center justify-center'>
      <h1 className='font-semibold text-3xl md:text-6xl lg:text-8xl bg-gradient-to-r from-gray-600 via-gray-900 to-gray-400 bg-clip-text text-transparent '>
        Face Detection 
      </h1>
     
      </div>
      <FaceDetection/>

    </div>
  )
}

export default page