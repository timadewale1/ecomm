import React, { useState } from 'react';
import { useInView } from 'react-intersection-observer';

const LazyImage = ({ src, alt, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true, // Load the image only once when it comes into view
    threshold: 0.1, // Trigger when 10% of the image is in view
  });

  return (
    <div ref={ref} style={{ minHeight: '1px', minWidth: '1px' }}>
      {inView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            width: '100%',
            height: 'auto',
          }}
          {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;
