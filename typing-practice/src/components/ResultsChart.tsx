import React from 'react';
import styled from 'styled-components';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const ChartContainer = styled.div`
  width: 100%;
  max-width: 1000px;
  margin-top: 20px;
  background: var(--bg-secondary);
  padding: 30px;
  border-radius: 8px;
  border: 2px solid var(--accent-secondary);
`;

const AverageStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 15px;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 2px solid var(--accent-secondary);
  
  h4 {
    color: var(--text-secondary);
    margin: 0;
    font-size: 0.9rem;
    font-weight: normal;
  }
  
  p {
    margin: 5px 0 0;
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--text-primary);
  }
`;

const ResetButton = styled.button`
  display: block;
  margin: 30px auto 0;
  padding: 12px 24px;
  font-size: 1rem;
  background-color: var(--accent-primary);
  color: var(--bg-primary);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(226, 183, 20, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
`;

interface Result {
  attempt: number;
  speed: number;
  accuracy: number;
  typingSpeed: number;
  errorRate: number;
}

interface Props {
  results: Result[];
  onReset: () => void;
}

const ResultsChart: React.FC<Props> = ({ results, onReset }) => {
  const averageSpeed = Math.round(
    results.reduce((acc, curr) => acc + curr.speed, 0) / results.length
  );
  const averageAccuracy = Math.round(
    results.reduce((acc, curr) => acc + curr.accuracy, 0) / results.length
  );
  const averageTypingSpeed = Math.round(
    results.reduce((acc, curr) => acc + curr.typingSpeed, 0) / results.length
  );
  const averageErrorRate = Math.round(
    results.reduce((acc, curr) => acc + curr.errorRate, 0) / results.length
  );

  return (
    <ChartContainer>
      <AverageStats>
        <StatItem>
          <h4>평균 WPM</h4>
          <p>{averageSpeed}</p>
        </StatItem>
        <StatItem>
          <h4>평균 정확도</h4>
          <p>{averageAccuracy}%</p>
        </StatItem>
        <StatItem>
          <h4>평균 타수</h4>
          <p>{averageTypingSpeed}</p>
        </StatItem>
        <StatItem>
          <h4>평균 오타율</h4>
          <p>{averageErrorRate}%</p>
        </StatItem>
      </AverageStats>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={results}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--accent-secondary)" />
          <XAxis 
            dataKey="attempt" 
            label={{ value: '시도 횟수', position: 'bottom', fill: 'var(--text-secondary)' }}
            tick={{ fill: 'var(--text-secondary)' }}
          />
          <YAxis 
            yAxisId="left" 
            label={{ value: 'WPM / 타수', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }}
            tick={{ fill: 'var(--text-secondary)' }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            label={{ value: '정확도 / 오타율 (%)', angle: 90, position: 'insideRight', fill: 'var(--text-secondary)' }}
            tick={{ fill: 'var(--text-secondary)' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--bg-secondary)', 
              border: '2px solid var(--accent-secondary)',
              color: 'var(--text-tertiary)'
            }}
            itemStyle={{ color: 'var(--text-tertiary)' }}
            labelStyle={{ color: 'var(--text-secondary)' }}
          />
          <Legend 
            wrapperStyle={{ 
              color: 'var(--text-secondary)',
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="speed"
            stroke="var(--text-primary)"
            name="WPM"
            strokeWidth={2}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="typingSpeed"
            stroke="#4ca64c"
            name="타수"
            strokeWidth={2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="accuracy"
            stroke="#ffc658"
            name="정확도"
            strokeWidth={2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="errorRate"
            stroke="#ca4754"
            name="오타율"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <ResetButton onClick={onReset}>
        다시 시작하기
      </ResetButton>
    </ChartContainer>
  );
};

export default ResultsChart;
