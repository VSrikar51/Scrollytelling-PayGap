// BAR CHART DATA
const barChartData = [
    {
        group: "White Men",
        race: "White",
        gender: "Men",
        ratio: 1.00,
        payGap: 0,
        annualSalary: 60000,
        count: 11051
    },
    {
        group: "Asian Men",
        race: "Asian",
        gender: "Men",
        ratio: 0.93,
        payGap: 7,
        annualSalary: 55800,
        count: 1250
    },
    {
        group: "Black Men",
        race: "Black",
        gender: "Men",
        ratio: 0.53,
        payGap: 47,
        annualSalary: 31800,
        count: 4475
    },
    {
        group: "Latino Men",
        race: "Latino",
        gender: "Men",
        ratio: 0.69,
        payGap: 31,
        annualSalary: 41400,
        count: 2850
    },
    {
        group: "Asian Women",
        race: "Asian",
        gender: "Women",
        ratio: 0.88,
        payGap: 12,
        annualSalary: 52800,
        count: 1180
    },
    {
        group: "White Women",
        race: "White",
        gender: "Women",
        ratio: 0.72,
        payGap: 28,
        annualSalary: 43200,
        count: 10412
    },
    {
        group: "Black Women",
        race: "Black",
        gender: "Women",
        ratio: 0.65,
        payGap: 35,
        annualSalary: 39000,
        count: 6032
    },
    {
        group: "Latina Women",
        race: "Latina",
        gender: "Women",
        ratio: 0.57,
        payGap: 43,
        annualSalary: 34200,
        count: 2650
    }
];

// VIOLIN CHART DATA

const violinChartData = [
    {
        group: "Asian - Men",
        race: "Asian",
        gender: "Men",
        median: 1.08,
        q1: 0.90,
        q3: 1.20,
        min: 0.75,
        max: 1.22
    },
    {
        group: "Asian - Women",
        race: "Asian",
        gender: "Women",
        median: 0.92,
        q1: 0.80,
        q3: 1.00,
        min: 0.55,
        max: 1.08
    },
    {
        group: "White - Men",
        race: "White",
        gender: "Men",
        median: 1.00,
        q1: 0.95,
        q3: 1.05,
        min: 0.93,
        max: 1.08
    },
    {
        group: "White - Women",
        race: "White",
        gender: "Women",
        median: 0.83,
        q1: 0.72,
        q3: 0.90,
        min: 0.60,
        max: 0.98
    },
    {
        group: "Black - Men",
        race: "Black",
        gender: "Men",
        median: 0.80,
        q1: 0.70,
        q3: 0.88,
        min: 0.55,
        max: 0.95
    },
    {
        group: "Black - Women",
        race: "Black",
        gender: "Women",
        median: 0.67,
        q1: 0.58,
        q3: 0.75,
        min: 0.45,
        max: 0.85
    },
    {
        group: "Hispanic - Men",
        race: "Hispanic",
        gender: "Men",
        median: 0.88,
        q1: 0.75,
        q3: 1.00,
        min: 0.60,
        max: 1.10
    },
    {
        group: "Hispanic - Women",
        race: "Hispanic",
        gender: "Women",
        median: 0.58,
        q1: 0.50,
        q3: 0.72,
        min: 0.40,
        max: 0.80
    },
    {
        group: "Native Am - Men",
        race: "Native American",
        gender: "Men",
        median: 0.80,
        q1: 0.65,
        q3: 0.90,
        min: 0.50,
        max: 0.95
    },
    {
        group: "Native Am - Women",
        race: "Native American",
        gender: "Women",
        median: 0.57,
        q1: 0.48,
        q3: 0.68,
        min: 0.40,
        max: 0.78
    },
    {
        group: "Multiracial - Men",
        race: "Multiracial",
        gender: "Men",
        median: 0.87,
        q1: 0.77,
        q3: 0.98,
        min: 0.60,
        max: 1.05
    },
    {
        group: "Multiracial - Women",
        race: "Multiracial",
        gender: "Women",
        median: 0.72,
        q1: 0.55,
        q3: 0.88,
        min: 0.45,
        max: 0.95
    }
];

// COLOR CONFIGURATION
const colors = {
    
    bars: {
        "White Men": "#20B2AA",     
        "Asian Men": "#3D3D3D",      
        "Black Men": "#8B0A50",      
        "Latino Men": "#4169E1",     
        "Asian Women": "#DC143C",    
        "White Women": "#1E90FF",    
        "Black Women": "#FFA500",    
        "Latina Women": "#FF8C00"    
    },
    // Violin plot color
    violin: "#F4C542",
    medianLine: "#8B4513",
    baseline: "#ef4444",
    grid: "#e2e8f0"
};

function getBarColor(group) {
    return colors.bars[group] || "#888888";
}


function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatPercent(value) {
    return `${value.toFixed(1)}%`;
}


function getGapColor(gap) {
    if (gap > 30) return "#ef4444";     
    if (gap > 15) return "#f59e0b";     
    return "#22c55e";                     
}


function getGapClass(gap) {
    if (gap > 30) return "high";
    if (gap > 15) return "medium";
    return "low";
}