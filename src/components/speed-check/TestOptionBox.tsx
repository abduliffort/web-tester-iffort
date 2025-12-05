import React from 'react';
import Image from 'next/image';

interface TestOptionBoxProps {
  boxName: string;
  text: string;
  btnText: string;
  imgSrc: string;
  boxStyle?: React.CSSProperties;
  isRecommended?: boolean;
}

const TestOptionBox: React.FC<TestOptionBoxProps> = ({
  boxName,
  text,
  btnText,
  imgSrc,
  boxStyle,
  isRecommended = false
}) => {
  return (
    <div className="border-1 rounded-lg p-6 text-center shadow-lg relative flex flex-col items-center" style={boxStyle}>
      {isRecommended && (
      <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs font-semibold px-4 py-1 rounded-md">RECOMMENDED</span>
      )}
      <div className="mb-4">
        <Image 
          src={imgSrc}
          alt="Full Test Icon" 
          width={60}
          height={60}
        />
      </div>
      <h3 className="text-2xl font-semibold mb-2">{boxName}</h3>
      <p className="text-gray-600 mb-4">{text}</p>
      <button className="text-600 border border-blue-600 px-6 py-2 rounded-md hover:bg-blue-50 transparent-btn">{btnText}</button>
    </div>
  );
};

export default TestOptionBox;