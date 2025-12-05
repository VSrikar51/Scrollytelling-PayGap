const tooltip = d3.select("#tooltip");
let allData = [];
let raceData = [];
let timelineData = [];
let particles = [];
let animationFrameId;

const stepObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const step = entry.target;
      step.classList.add('active');
      const stepNum = parseInt(step.dataset.step);
      updateVisualizationForStep(stepNum);
    } else {
      entry.target.classList.remove('active');
    }
  });
}, {
  threshold: 0.6
});

document.querySelectorAll('.step').forEach(step => {
  stepObserver.observe(step);
});

Promise.all([
  d3.csv("adult.csv"),
  d3.csv("data/timeline-data.csv")
]).then(([adultData, timeData]) => {
  allData = adultData.filter(d => d.race && d.gender && d.income && d.age);
  timelineData = timeData;
  
  timelineData.forEach(d => {
    d.year = +d.year;
    d.ratio = +d.ratio;
  });
  
  const groupRace = d3.rollups(
    allData,
    v => ({
      Male: v.filter(d => d.gender === "Male" && d.income === ">50K").length / v.filter(d => d.gender === "Male").length,
      Female: v.filter(d => d.gender === "Female" && d.income === ">50K").length / v.filter(d => d.gender === "Female").length,
      totalCount: v.length
    }),
    d => d.race
  );

  raceData = groupRace.map(([race, vals]) => ({
    race,
    Male: vals.Male || 0,
    Female: vals.Female || 0,
    count: vals.totalCount
  }));

  initializeRaceGenderViz();
  drawScatterPlot();
  updateSummaryStats();
  
  createBarChart("bar-chart", barChartData);
  createViolinChart("violin-chart", violinChartData);
  
  drawTimelineChart();
  initParticleSystem();
  drawHexMap();
});

function updateSummaryStats() {
  const blackWomen = barChartData.find(d => d.group === "Black Women");
  const whiteMen = barChartData.find(d => d.group === "White Men");
  
  if (blackWomen && whiteMen) {
    document.getElementById("stat-gap").textContent = `${blackWomen.payGap}%`;
    
    const annualDiff = whiteMen.annualSalary - blackWomen.annualSalary;
    document.getElementById("stat-annual").textContent = `$${Math.round(annualDiff / 1000)}K`;
    
    document.getElementById("stat-ratio").textContent = `$${blackWomen.ratio.toFixed(2)}`;
  }
}

function updateVisualizationForStep(stepNum) {
  if (stepNum >= 0 && stepNum <= 2) {
    updateRaceGenderViz(stepNum);
  } else if (stepNum >= 3 && stepNum <= 5) {
    updateTimelineViz(stepNum - 3);
  } else if (stepNum >= 6 && stepNum <= 8) {
    updateParticleViz(stepNum - 6);
  }
}

function initializeRaceGenderViz() {
  const container = d3.select("#race-gender-viz");
  const width = 700;
  const height = 500;
  const margin = { top: 40, right: 20, bottom: 80, left: 90 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const genders = ["Male", "Female"];
  
  const x0 = d3.scaleBand()
    .domain(raceData.map(d => d.race))
    .range([0, innerWidth])
    .padding(0.25);

  const x1 = d3.scaleBand()
    .domain(genders)
    .range([0, x0.bandwidth()])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(raceData, d => Math.max(d.Male, d.Female)) * 1.1])
    .range([innerHeight, 0]);

  const color = d3.scaleOrdinal()
    .domain(genders)
    .range(["#4e79a7", "#e15759"]);

  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x0))
    .selectAll("text")
    .style("font-size", "12px")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-35)");

  svg.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -65)
    .attr("text-anchor", "middle")
    .style("fill", "#fff")
    .text("Proportion Earning > $50K");

  const groups = svg.selectAll(".race-group")
    .data(raceData)
    .enter()
    .append("g")
    .attr("class", d => `race-group race-${d.race.replace(/[^a-zA-Z]/g, '')}`)
    .attr("transform", d => `translate(${x0(d.race)},0)`);

  groups.selectAll("rect")
    .data(d => genders.map(g => ({ gender: g, value: d[g], race: d.race, count: d.count })))
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x1(d.gender))
    .attr("y", innerHeight)
    .attr("width", x1.bandwidth())
    .attr("height", 0)
    .attr("fill", d => color(d.gender))
    .on("mouseover", (event, d) => {
      showTooltip(event, `<div class="tooltip-title">${d.race} — ${d.gender}</div>
        <div class="tooltip-row">
          <span class="tooltip-label">Earning >$50K:</span>
          <span class="tooltip-value">${(d.value * 100).toFixed(1)}%</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Sample Size:</span>
          <span class="tooltip-value">${d.count.toLocaleString()}</span>
        </div>`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip)
    .transition()
    .duration(1000)
    .delay((d, i) => i * 100)
    .attr("y", d => y(d.value))
    .attr("height", d => innerHeight - y(d.value));
}

function updateRaceGenderViz(step) {
  const groups = d3.selectAll('.race-group');
  
  if (step === 1) {
    groups.classed('dimmed', false);
    raceData.forEach((d, i) => {
      setTimeout(() => {
        groups.classed('dimmed', true);
        d3.select(`.race-${d.race.replace(/[^a-zA-Z]/g, '')}`).classed('dimmed', false);
      }, i * 800);
    });
  } else {
    groups.classed('dimmed', false);
  }
}

function drawScatterPlot() {
  const scatterData = d3.rollups(
    allData,
    v => ({
      proportionHighIncome: v.filter(d => d.income === ">50K").length / v.length,
      avgExperience: d3.mean(v, d => Math.max(0, parseInt(d.age) - 18)),
      count: v.length
    }),
    d => d.race,
    d => d.gender
  ).flatMap(([race, genderData]) => 
    genderData.map(([gender, vals]) => ({
      race,
      gender,
      proportion: vals.proportionHighIncome,
      experience: vals.avgExperience,
      count: vals.count
    }))
  );

  const container = d3.select("#scatter-plot-container");
  const width = 900;
  const height = 500;
  const margin = { top: 40, right: 40, bottom: 80, left: 90 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(scatterData, d => d.experience) * 1.1])
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(scatterData, d => d.proportion) * 1.1])
    .range([innerHeight, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -65)
    .attr("text-anchor", "middle")
    .style("fill", "#fff")
    .text("Proportion Earning > $50K");

  svg.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 60)
    .attr("text-anchor", "middle")
    .style("fill", "#fff")
    .text("Average Experience (Age - 18)");

  const shapes = {
    "White": d3.symbolCircle,
    "Black": d3.symbolSquare,
    "Asian-Pac-Islander": d3.symbolTriangle,
    "Amer-Indian-Eskimo": d3.symbolDiamond,
    "Other": d3.symbolStar
  };

  svg.selectAll(".scatter-point")
    .data(scatterData)
    .enter()
    .append("path")
    .attr("d", d => d3.symbol().type(shapes[d.race] || d3.symbolCircle).size(200)())
    .attr("transform", d => `translate(${x(d.experience)},${y(d.proportion)})`)
    .attr("fill", d => d.gender === "Male" ? "#4e79a7" : "#e15759")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1)
    .style("opacity", 0)
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => {
      d3.select(event.target).attr("stroke-width", 3);
      showTooltip(event, `<div class="tooltip-title">${d.race} — ${d.gender}</div>
        <div class="tooltip-row">
          <span class="tooltip-label">Earning >$50K:</span>
          <span class="tooltip-value">${(d.proportion * 100).toFixed(1)}%</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Avg Experience:</span>
          <span class="tooltip-value">${d.experience.toFixed(1)} years</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Sample Size:</span>
          <span class="tooltip-value">${d.count.toLocaleString()}</span>
        </div>`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", (event) => {
      d3.select(event.target).attr("stroke-width", 1);
      hideTooltip();
    })
    .transition()
    .duration(1000)
    .delay((d, i) => i * 100)
    .style("opacity", 0.7);
}

function drawTimelineChart() {
  const margin = {top: 50, right: 80, bottom: 60, left: 70};
  const width = 800 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#timeline-chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain([1979, 2023])
    .range([0, width]);
  
  const yScale = d3.scaleLinear()
    .domain([55, 90])
    .range([height, 0]);

  const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10);
  const yAxis = d3.axisLeft(yScale).tickFormat(d => d + "%");

  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);
  
  svg.append("g")
    .attr("class", "y-axis")
    .call(yAxis);

  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale)
      .tickSize(-width)
      .tickFormat("")
    );

  svg.append("text")
    .attr("class", "x-label")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Year");
      
  svg.append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Women's Earnings as % of Men's");

  svg.append("text")
    .attr("class", "chart-title-text")
    .attr("x", width / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "700")
    .text("The Stagnant Progress towards Pay Equity");

  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.ratio))
    .curve(d3.curveMonotoneX);

  const path = svg.append("path")
    .datum(timelineData)
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "#667eea")
    .attr("stroke-width", 3)
    .attr("d", line);
              
  const totalLength = path.node().getTotalLength();

  path.attr("stroke-dasharray", totalLength + " " + totalLength)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(2000)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0);

  svg.selectAll(".data-point")
    .data(timelineData)
    .enter()
    .append('circle')
    .attr("class", "data-point")
    .attr("cx", d => xScale(d.year))
    .attr("cy", d => yScale(d.ratio))
    .attr("r", 0)
    .attr("fill", "#667eea")
    .transition()
    .delay((d, i) => i * 40)
    .duration(500)
    .attr("r", 3);
  
  const tooltipTimeline = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  
  d3.selectAll(".data-point")
    .on("mouseover", function(event, d) {
      tooltipTimeline.transition()
        .duration(200)
        .style("opacity", 0.9);
      
      tooltipTimeline.html(`<strong>${d.year}</strong><br/>
                Women Earn <strong>${d.ratio}%</strong><br/> of Men's Earnings`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
          
      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", 6);
    })
    .on("mouseout", function() {
      tooltipTimeline.transition().duration(500).style("opacity", 0);
      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", 3);
    });

  const year2000Data = timelineData.find(d => d.year === 2000);

  if (year2000Data) {
    svg.append("line")
      .attr("class", "annotation-line")
      .attr("x1", xScale(2000))
      .attr("y1", 0)
      .attr("x2", xScale(2000))
      .attr("y2", height)
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5,5")
      .style("opacity", 0)
      .transition()
      .delay(2500)
      .duration(500)
      .style("opacity", 0.5);

    svg.append("text")
      .attr("class", "annotation-text")
      .attr("x", xScale(2000) + 5)
      .attr("y", yScale(85))
      .attr("text-anchor", "start")
      .style("font-size", "12px")
      .style("opacity", 0)
      .text("Progress slows after 2000")
      .transition()
      .delay(2500)
      .duration(500)
      .style("opacity", 1);
  }
}

function updateTimelineViz(step) {
  const path = d3.select(".line");
  const circles = d3.selectAll(".data-point");

  if (step === 0) {
    path.transition()
      .duration(1000)
      .attr("stroke", "#667eea")
      .attr("stroke-width", 3);

    circles.transition()
      .duration(1000)
      .attr("fill", "#667eea");
  } else if (step === 1) {
    path.transition()
      .duration(1000)
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 5);

    circles.transition()
      .duration(1000)
      .attr("fill", "#ef4444");
  } else if (step === 2) {
    path.transition()
      .duration(1000)
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 4);

    circles.transition()
      .duration(1000)
      .attr("fill", "#f59e0b");
  }
}

function initParticleSystem() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = 500;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const baseline = {
    total: 3889600,
    particleCount: 389
  };

  const particleGroups = [
    {
      name: "White Men BA",
      earnings: 3889600,
      particleCount: 389,
      loss: 0,
      lossParticles: 0,
      color: "#10b981",
      targetY: 0.25,
      fallAway: false,
      active: true
    },
    {
      name: "White Women BA",
      earnings: 2988960,
      particleCount: 299,
      loss: 900640,
      lossParticles: 90,
      color: "#f59e0b",
      targetY: 0.65,
      fallAway: true,
      active: false
    },
    {
      name: "Black Women",
      earnings: 1849120,
      particleCount: 185,
      loss: 2040480,
      lossParticles: 204,
      color: "#ef4444",
      targetY: 0.75,
      fallAway: true,
      active: false
    },
    {
      name: "Hispanic Women",
      earnings: 1664000,
      particleCount: 166,
      loss: 2225600,
      lossParticles: 223,
      color: "#ec4899",
      targetY: 0.85,
      fallAway: true,
      active: false
    }
  ];

  class Particle {
    constructor(x, y, group, groupIndex, isFalling) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.group = group;
      this.groupIndex = groupIndex;
      this.radius = 3;
      this.alpha = 0.85;
      this.isFalling = isFalling || false;
      this.targetReached = false;
    }
    
    update() {
      if (!this.group.active) return;
      
      if (this.isFalling && this.group.fallAway) {
        const targetY = canvas.height * this.group.targetY;
        
        this.vy += 0.15;
        this.vy *= 0.98;
        
        this.vx += (Math.random() - 0.5) * 0.1;
        this.vx *= 0.95;
        
        this.y += this.vy;
        this.x += this.vx;
        
        if (this.y > targetY) {
          this.alpha *= 0.98;
        }
      } else {
        const targetY = canvas.height * 0.25;
        const targetX = canvas.width / 2;
        
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
          this.vx += dx * 0.0005;
          this.vy += dy * 0.0005;
        }
        
        this.vx *= 0.92;
        this.vy *= 0.92;
        
        this.x += this.vx;
        this.y += this.vy;
      }
      
      if (this.x < 0) this.x = 0;
      if (this.x > canvas.width) this.x = canvas.width;
    }
    
    draw() {
      if (this.alpha < 0.05) return;
      
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.group.color;
      ctx.globalAlpha = this.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function initParticles() {
    particles = [];
    
    const startX = canvas.width / 2;
    const startY = canvas.height * 0.25;
    
    particleGroups.forEach((group, groupIndex) => {
      if (groupIndex === 0) {
        for (let i = 0; i < baseline.particleCount; i++) {
          const x = startX + (Math.random() - 0.5) * 120;
          const y = startY + (Math.random() - 0.5) * 120;
          particles.push(new Particle(x, y, group, groupIndex, false));
        }
      } else {
        for (let i = 0; i < group.particleCount; i++) {
          const x = startX + (Math.random() - 0.5) * 120;
          const y = startY + (Math.random() - 0.5) * 120;
          particles.push(new Particle(x, y, group, groupIndex, false));
        }
        
        for (let i = 0; i < group.lossParticles; i++) {
          const x = startX + (Math.random() - 0.5) * 120;
          const y = startY + (Math.random() - 0.5) * 120;
          particles.push(new Particle(x, y, group, groupIndex, true));
        }
      }
    });
  }

  function animate() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });
    
    animationFrameId = requestAnimationFrame(animate);
  }

  window.updateParticleViz = function(step) {
    if (step === 0) {
      particleGroups[0].active = true;
      particleGroups[1].active = false;
      particleGroups[2].active = false;
      particleGroups[3].active = false;
    } else if (step === 1) {
      particleGroups[0].active = true;
      particleGroups[1].active = true;
      particleGroups[2].active = false;
      particleGroups[3].active = false;
    } else if (step === 2) {
      particleGroups[0].active = true;
      particleGroups[1].active = true;
      particleGroups[2].active = true;
      particleGroups[3].active = true;
    }
  };

  initParticles();
  animate();
}

function drawHexMap() {
  const sampleData = [
    {abbr:"AL", gap:23.1}, {abbr:"AK", gap:16.7}, {abbr:"AZ", gap:18.6}, {abbr:"AR", gap:20.9},
    {abbr:"CA", gap:18.2}, {abbr:"CO", gap:15.9}, {abbr:"CT", gap:15.1}, {abbr:"DE", gap:17.8},
    {abbr:"DC", gap:12.4}, {abbr:"FL", gap:18.9}, {abbr:"GA", gap:20.3}, {abbr:"HI", gap:14.4},
    {abbr:"ID", gap:19.5}, {abbr:"IL", gap:17.6}, {abbr:"IN", gap:20.1}, {abbr:"IA", gap:18.3},
    {abbr:"KS", gap:19.8}, {abbr:"KY", gap:21.0}, {abbr:"LA", gap:22.7}, {abbr:"ME", gap:13.9},
    {abbr:"MD", gap:14.7}, {abbr:"MA", gap:13.5}, {abbr:"MI", gap:17.9}, {abbr:"MN", gap:14.9},
    {abbr:"MS", gap:24.5}, {abbr:"MO", gap:19.6}, {abbr:"MT", gap:18.0}, {abbr:"NE", gap:18.7},
    {abbr:"NV", gap:19.0}, {abbr:"NH", gap:13.8}, {abbr:"NJ", gap:15.4}, {abbr:"NM", gap:19.7},
    {abbr:"NY", gap:16.3}, {abbr:"NC", gap:19.9}, {abbr:"ND", gap:17.1}, {abbr:"OH", gap:18.4},
    {abbr:"OK", gap:21.4}, {abbr:"OR", gap:16.9}, {abbr:"PA", gap:16.8}, {abbr:"RI", gap:15.2},
    {abbr:"SC", gap:20.7}, {abbr:"SD", gap:17.5}, {abbr:"TN", gap:21.9}, {abbr:"TX", gap:19.4},
    {abbr:"UT", gap:22.2}, {abbr:"VT", gap:12.9}, {abbr:"VA", gap:16.1}, {abbr:"WA", gap:15.0},
    {abbr:"WV", gap:23.6}, {abbr:"WI", gap:16.5}, {abbr:"WY", gap:20.5}
  ];

  const data = new Map(sampleData.map(d => [d.abbr, d.gap]));

  const layout = [
    ["AK",-3,0],
    ["WA",0,0],["MT",1,0],["ND",2,0],["MN",3,0],["WI",4,0],["MI",5,0],["NY",6,0],["VT",7,0],["NH",8,0],["ME",9,0],
    ["OR",0,1],["ID",1,1],["WY",2,1],["SD",3,1],["IA",4,1],["IL",5,1],["IN",6,1],["OH",7,1],["PA",8,1],["NJ",9,1],["MA",10,1],["RI",11,1],["CT",10,0],
    ["CA",0,2],["NV",1,2],["UT",2,2],["CO",3,2],["NE",4,2],["MO",5,2],["KY",6,2],["WV",7,2],["MD",8,2],["DE",9,2],["DC",11,2],
    ["AZ",0,3],["NM",1,3],["OK",2,3],["AR",3,3],["LA",4,3],["MS",5,3],["AL",6,3],["GA",7,3],["VA",8,3],["NC",9,3],
    ["HI",-2,4],["TX",2,4],["SC",7,4],["FL",8,4]
  ];

  const svg = d3.select("#hex-map")
    .append("svg")
    .attr("viewBox", "0 0 1000 620")
    .attr("preserveAspectRatio", "xMidYMid meet");

    const viewW = 1000, viewH = 620;
  const hexR = 30;
  const xStep = hexR * 1.85;
  const yStep = Math.sqrt(3) * hexR * 0.72;

  const xs = layout.map(d => d[1]);
  const ys = layout.map(d => d[2]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const gridW = (maxX - minX + 1) * xStep;
  const gridH = (maxY - minY + 1) * yStep + hexR;
  const offsetX = (viewW - gridW) / 2 + hexR - minX * xStep;
  const offsetY = (viewH - gridH) / 2 + hexR - minY * yStep;

  const nodes = layout.map(([abbr, col, row]) => {
    let x = offsetX + col * xStep + (row % 2 ? xStep / 2 : 0);
    let y = offsetY + row * yStep;

    if (abbr === "AK") { x = offsetX - hexR * 2; y = offsetY - hexR * 1.1; }
    if (abbr === "HI") { x = offsetX - hexR * 1.8; y = offsetY + gridH - hexR * 0.5; }
    if (abbr === "DC") { x += hexR * 0.6; }

    return {
      abbr,
      gap: data.get(abbr),
      x, y
    };
  });

  const gaps = sampleData.map(d => d.gap);
  const minGap = d3.min(gaps), maxGap = d3.max(gaps);
  const color = d3.scaleLinear()
    .domain([minGap, (minGap + maxGap) / 2, maxGap])
    .range(["#d7f3ef", "#6ad1bf", "#00807a"]);

  const g = svg.append("g");

  const hexPoints = (() => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI / 180 * (60 * i - 30);
      pts.push([hexR * Math.cos(ang), hexR * Math.sin(ang)]);
    }
    return pts.map(p => p.join(",")).join(" ");
  })();

  const tiles = g.selectAll("g.tile")
    .data(nodes)
    .enter()
    .append("g")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  tiles.append("polygon")
    .attr("points", hexPoints)
    .attr("fill", d => isFinite(d.gap) ? color(d.gap) : "#ccc")
    .on("mouseenter", (e, d) => {
      d3.select(e.currentTarget).attr("stroke", "#083a3a").attr("stroke-width", 2.6).attr("transform", "scale(1.04)");
      showTooltip(e, `<div class="tooltip-title">${d.abbr}</div>
        <div class="tooltip-row">
          <span class="tooltip-label">Gap:</span>
          <span class="tooltip-value">${isFinite(d.gap) ? d.gap.toFixed(1) + "%" : "—"}</span>
        </div>`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", (e, d) => {
      d3.select(e.currentTarget).attr("stroke", "#ffffff").attr("stroke-width", 2).attr("transform", "scale(1)");
      hideTooltip();
    });

  tiles.append("text")
    .attr("class", "hex-label")
    .attr("dy", 4)
    .text(d => d.abbr);
}

function showTooltip(event, html) {
  tooltip.html(html).style("opacity", 1);
  moveTooltip(event);
}

function moveTooltip(event) {
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

function hideTooltip() {
  tooltip.style("opacity", 0);
}