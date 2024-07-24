import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import styled from 'styled-components';

const Container = styled.div`
  width: 150px;
  height: 150px;
  position: relative;
`;

const TextContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -45%);
  text-align: center;
  font-family: 'Roboto', sans-serif; 
`;

const ValueText = styled.div`
  font-size: 60px;
  font-weight: bold;
  font-family: 'Roboto', sans-serif;
`;

const LabelText = styled.div`
  font-size: 14px;
  color: gray;
  transform: translateY(-20px);
`;

const CircularProgress = ({ value, maxValue }) => {
  const percentage = (value / maxValue) * 100;

  return (
    <Container>
      <CircularProgressbar
        value={percentage}
        styles={buildStyles({
          textColor: '#000',
          textSize: '24px',
          pathColor: '#f9531e',
          trailColor: '#d6d6d6',
          pathTransitionDuration: 5,
          pathTransition: 'stroke-dashoffset 0.5s ease 0s',
          strokeLinecap: 'round',
        })}
      />
      <TextContainer>
        <ValueText>{value}</ValueText>
        <LabelText>Orders</LabelText>
      </TextContainer>
    </Container>
  );
};

export default CircularProgress;
