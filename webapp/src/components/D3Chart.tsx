'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DataPoint {
  timestamp: Date;
  value: number;
}

interface D3ChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  title: string;
  color?: string;
  yLabel?: string;
}

export default function D3Chart({ 
  data, 
  width = 400, 
  height = 200, 
  title,
  color = '#3b82f6',
  yLabel = 'Value'
}: D3ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.timestamp) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.value) as [number, number])
      .nice()
      .range([innerHeight, 0]);

    const line = d3.line<DataPoint>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat((d: Date | d3.NumberValue) => {
        if (d instanceof Date) {
          return d3.timeFormat('%H:%M')(d);
        }
        return '';
      }))
      .selectAll('text')
      .attr('fill', '#67e8f9'); // quantum-300

    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .attr('fill', '#67e8f9'); // quantum-300

    // Style axis lines
    g.selectAll('.domain')
      .attr('stroke', '#22d3ee'); // quantum-400

    g.selectAll('.tick line')
      .attr('stroke', '#22d3ee'); // quantum-400

    // Add y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#67e8f9') // quantum-300
      .text(yLabel);

    // Add the line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add dots
    g.selectAll('.dot')
      .data(data)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.timestamp))
      .attr('cy', d => yScale(d.value))
      .attr('r', 3)
      .attr('fill', color);

  }, [data, width, height, color, yLabel]);

  return (
    <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-4">
      <h3 className="text-sm font-medium text-fusion-400 mb-2">{title}</h3>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible bg-transparent"
      />
    </div>
  );
}