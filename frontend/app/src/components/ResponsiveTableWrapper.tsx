import React from 'react'

export const ResponsiveTableWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <div className="w-full overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="min-w-full inline-block align-middle">
        {children}
      </div>
    </div>
  )
}

export default ResponsiveTableWrapper
