/* Bar Chart Module */

function createBarChart(containerId, data) {

    const container = d3.select(`#${containerId}`);
    const containerWidth = container.node().getBoundingClientRect().width;
    const margin = { top: 50, right: 40, bottom: 120, left: 80 };
    const width = Math.min(containerWidth - 20, 900) - margin.left - margin.right;
    const height = 480 - margin.top - margin.bottom;
    
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
        .padding(0.25);
    
    const y = d3.scaleLinear()
        .domain([0, 1.15])
        .range([height, 0]);
    
    // GRID LINES
    svg.selectAll(".grid-line")
        .data(y.ticks(10))
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => y(d))
        .attr("y2", d => y(d));
    

    // BASELINE AT $1.00
    svg.append("line")
        .attr("class", "baseline")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(1))
        .attr("y2", y(1));
    
    svg.append("text")
        .attr("class", "baseline-label")
        .attr("x", width - 5)
        .attr("y", y(1) - 10)
        .attr("text-anchor", "end")
        .text("$1.00 Baseline (White Men)");
    
    // BARS
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.group))
        .attr("y", height) 
        .attr("width", x.bandwidth())
        .attr("height", 0) 
        .attr("fill", d => getBarColor(d.group))
        .attr("stroke", "#1e293b")
        .attr("stroke-width", 1.5)
        .attr("rx", 4)
        .attr("ry", 4)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("filter", "brightness(1.15)")
                .attr("stroke-width", 2.5);
            
            // Show tooltip
            showBarTooltip(event, d);
        })
        .on("mousemove", function(event) {
            moveTooltip(event);
        })
        .on("mouseout", function() {
            
            d3.select(this)
                .transition()
                .duration(200)
                .attr("filter", "none")
                .attr("stroke-width", 1.5);
            
            
            hideTooltip();
        })
    
        .transition()
        .duration(800)
        .delay((d, i) => i * 80)
        .ease(d3.easeBounceOut)
        .attr("y", d => y(d.ratio))
        .attr("height", d => height - y(d.ratio));
    

    svg.selectAll(".value-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "value-label")
        .attr("x", d => x(d.group) + x.bandwidth() / 2)
        .attr("y", d => y(d.ratio) - 8)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .attr("fill", "#1e293b")
        .attr("opacity", 0)
        .text(d => `$${d.ratio.toFixed(2)}`)
        .transition()
        .duration(500)
        .delay((d, i) => i * 80 + 600)
        .attr("opacity", 1);
    
    // X AXIS
    svg.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .attr("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em")
        .attr("font-size", "12px")
        .attr("font-weight", "500");
    
    svg.append("g")
        .attr("class", "axis y-axis")
        .call(d3.axisLeft(y)
            .tickFormat(d => `$${d.toFixed(2)}`)
            .ticks(10));
    
    // Y Axis Label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .text("Earnings Ratio ($ per $1.00 White Men Earn)");
    
    // CREATE LEGEND
    createBarLegend(data);
}


//Show tooltip for bar chart
function showBarTooltip(event, d) {
    const gapClass = getGapClass(d.payGap);
    
    const tooltipHTML = `
        <div class="tooltip-title">${d.group}</div>
        <div class="tooltip-row">
            <span class="tooltip-label">Earning Ratio:</span>
            <span class="tooltip-value">$${d.ratio.toFixed(2)}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Annual Salary:</span>
            <span class="tooltip-value">${formatCurrency(d.annualSalary)}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Pay Gap:</span>
            <span class="tooltip-gap ${gapClass}">${d.payGap}%</span>
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


// Move tooltip to follow mouse
function moveTooltip(event) {
    const tooltip = d3.select("#tooltip");
    const tooltipNode = tooltip.node();
    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;
    
    let left = event.pageX + 15;
    let top = event.pageY - tooltipHeight / 2;
    
    if (left + tooltipWidth > window.innerWidth - 20) {
        left = event.pageX - tooltipWidth - 15;
    }
    if (top < 10) {
        top = 10;
    }
    if (top + tooltipHeight > window.innerHeight - 10) {
        top = window.innerHeight - tooltipHeight - 10;
    }
    
    tooltip
        .style("left", `${left}px`)
        .style("top", `${top}px`);
}

//Hide tooltip
function hideTooltip() {
    d3.select("#tooltip")
        .style("opacity", 0);
}

function createBarLegend(data) {
    const legendContainer = d3.select("#bar-legend");
    legendContainer.selectAll("*").remove();
    
    data.forEach(d => {
        const item = legendContainer.append("div")
            .attr("class", "legend-item");
        
        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", getBarColor(d.group));
        
        item.append("span")
            .text(d.group);
    });
}