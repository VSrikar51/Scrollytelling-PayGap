// Violin Chart Module
function createViolinChart(containerId, data) {

    const container = d3.select(`#${containerId}`);
    const containerWidth = container.node().getBoundingClientRect().width;
    
    // Chart dimensions
    const margin = { top: 50, right: 40, bottom: 100, left: 70 };
    const width = Math.min(containerWidth - 20, 1100) - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;
    
    container.selectAll("*").remove();
    
    // Create SVG
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Get tooltip element
    const tooltip = d3.select("#tooltip");
    

    const x = d3.scaleBand()
        .domain(data.map(d => d.group))
        .range([0, width])
        .padding(0.1);
    
    const y = d3.scaleLinear()
        .domain([0.35, 1.30])
        .range([height, 0]);
    

    [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2].forEach(tick => {
        svg.append("line")
            .attr("class", "grid-line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", y(tick))
            .attr("y2", y(tick));
    });
    

    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(1))
        .attr("y2", y(1))
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5");
    
    svg.append("text")
        .attr("x", width - 5)
        .attr("y", y(1) - 8)
        .attr("text-anchor", "end")
        .attr("font-size", "11px")
        .attr("fill", "#64748b")
        .text("1.0 = White Men baseline");
    
    
    const violinWidth = x.bandwidth() * 0.4;
    
    data.forEach((d, i) => {
        const centerX = x(d.group) + x.bandwidth() / 2;
        
        
        const numPoints = 50;
        const violinPoints = [];
        
        for (let j = 0; j <= numPoints; j++) {
            const t = j / numPoints;
            const yVal = d.min + t * (d.max - d.min);
            
         
            const distFromMedian = Math.abs(yVal - d.median);
            const spread = (d.q3 - d.q1) / 2;
            const normalizedDist = spread > 0 ? distFromMedian / spread : 0;
            const density = Math.exp(-0.5 * normalizedDist * normalizedDist);
            
            violinPoints.push({
                y: yVal,
                width: violinWidth * density
            });
        }
        
        const areaGenerator = d3.area()
            .x0(pt => centerX - pt.width)
            .x1(pt => centerX + pt.width)
            .y(pt => y(pt.y))
            .curve(d3.curveCatmullRom);
        
        // Draw violin shape
        svg.append("path")
            .datum(violinPoints)
            .attr("class", "violin-shape")
            .attr("d", areaGenerator)
            .attr("fill", colors.violin)
            .attr("fill-opacity", 0.75)
            .attr("stroke", d3.color(colors.violin).darker(0.3))
            .attr("stroke-width", 1)
            .style("opacity", 0)
            .on("mouseover", function(event) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("fill-opacity", 0.9)
                    .attr("stroke-width", 2);
                
                showViolinTooltip(event, d);
            })
            .on("mousemove", function(event) {
                moveTooltip(event);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("fill-opacity", 0.75)
                    .attr("stroke-width", 1);
                
                hideTooltip();
            })
            .transition()
            .duration(800)
            .delay(i * 80)
            .style("opacity", 1);
        
        svg.append("line")
            .attr("class", "median-line")
            .attr("x1", centerX - violinWidth * 0.6)
            .attr("x2", centerX + violinWidth * 0.6)
            .attr("y1", y(d.median))
            .attr("y2", y(d.median))
            .style("opacity", 0)
            .transition()
            .duration(500)
            .delay(i * 80 + 500)
            .style("opacity", 1);
    });
    
    
    svg.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .attr("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em")
        .attr("font-size", "11px")
        .attr("font-weight", "500");
    
  
    svg.append("g")
        .attr("class", "axis y-axis")
        .call(d3.axisLeft(y)
            .tickFormat(d => d.toFixed(1))
            .ticks(8));
    
    // Y Axis Label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Pay Ratio vs White Men");
    
   
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "600")
        .attr("fill", "#1e293b")
        .text("Distribution of Pay Ratios — 2024");
}


function showViolinTooltip(event, d) {
    const tooltipHTML = `
        <div class="tooltip-title">${d.group}</div>
        <div class="tooltip-row">
            <span class="tooltip-label">Median Ratio:</span>
            <span class="tooltip-value">${d.median.toFixed(2)}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">25th Percentile:</span>
            <span class="tooltip-value">${d.q1.toFixed(2)}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">75th Percentile:</span>
            <span class="tooltip-value">${d.q3.toFixed(2)}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Range (5-95%):</span>
            <span class="tooltip-value">${d.min.toFixed(2)} - ${d.max.toFixed(2)}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Gender:</span>
            <span class="tooltip-value">${d.gender}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Race:</span>
            <span class="tooltip-value">${d.race}</span>
        </div>
    `;
    
    d3.select("#tooltip")
        .html(tooltipHTML)
        .style("opacity", 1);
    
    moveTooltip(event);
}