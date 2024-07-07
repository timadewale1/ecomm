import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Market = () => {
  const cardsRef = useRef([]);

  useEffect(() => {
    cardsRef.current.forEach((card, index) => {
      gsap.fromTo(
        card,
        {
          opacity: 0,
          x: index % 2 === 0 ? -100 : 100, // Alternate between left and right
        },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          scrollTrigger: {
            trigger: card,
            start: 'top 80%',
            end: 'top 30%',
            toggleActions: 'play none none none',
            once: true, 
          },
        }
      );
    });
  }, []);

  return (
    <div className='justify-around mt-4 px-4'>
      {[...Array(3)].map((_, index) => (
        <div
          key={index}
          ref={(el) => (cardsRef.current[index] = el)}
          className='w-auto mb-2 rounded-lg h-40 bg-green-700'
        />
      ))}
    </div>
  );
};

export default Market;
