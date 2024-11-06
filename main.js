d3.csv("drug-use-by-age.csv").then(function(data) {
    data.forEach(d => {
        for (const key in d) {
            if (key === "age") {
                d[key] = d[key];
            } else {
                d[key] = isNaN(+d[key]) ? 0 : +d[key];
            }
        }
    });
    
    console.log(data);
    let selectedAges = [];
    let usageType = "percentage";

    generateGraph(data, selectedAges, usageType);

    d3.select("#usage-type-dropdown").on("change", function() {
        usageType = this.value;
        generateGraph(data, selectedAges, usageType);
    });

    d3.selectAll("#age-selection input[type='checkbox']").on("change", function() {
        selectedAges = Array.from(d3.selectAll("#age-selection input[type='checkbox']:checked"))
                            .map(d => d.value);
        generateGraph(data, selectedAges, usageType);
    });
});

function generateGraph(data, selectedAges, usageType) {
    const margin = { top: 40, right: 40, bottom: 40, left: 60 };
    const width = 900 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("svg");
    svg.selectAll("*").remove();
    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const filteredData = data.filter(d => selectedAges.includes(d.age));

    const substances = [
        'alcohol_use', 'marijuana_use', 'cocaine_use', 'crack_use', 'heroin_use',
        'hallucinogen_use', 'inhalant_use', 'pain_releiver_use', 'oxycontin_use',
        'tranquilizer_use', 'stimulant_use', 'meth_use', 'sedative_use'
    ];

    const colors = d3.scaleOrdinal(d3.schemeCategory10).domain(selectedAges);

    const maxValue = d3.max(filteredData, d =>
        d3.sum(substances, substance =>
            usageType === 'percentage' ? d[`${substance}`] : d[`${substance.replace('_use', '_frequency')}`]
        )
    );

    const xScale = d3.scaleBand()
        .domain(substances)
        .range([0, width])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([height, 0]);

    g.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d => d.replace('_use', '').replace('_frequency', '')));

    g.append("g")
        .call(d3.axisLeft(yScale));

    const stackedData = d3.stack()
        .keys(selectedAges)
        .value((d, age) => {
            const ageData = filteredData.find(row => row.age === age);
            return ageData ? (usageType === "percentage" ? ageData[d] : ageData[d.replace('_use', '_frequency')]) : 0;
        })
        (substances);

    g.selectAll(".substance")
        .data(stackedData)
        .enter().append("g")
        .attr("class", "substance")
        .attr("fill", d => colors(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter().append("rect")
        .attr("x", (d, i) => xScale(substances[i]))
        .attr("y", d => yScale(d[1]))
        .attr("height", d => yScale(d[0]) - yScale(d[1]))
        .attr("width", xScale.bandwidth())
        .on("mouseover", function(event, d) {
            const ageGroup = d3.select(this.parentNode).datum().key;
            const value = d[1] - d[0];
            d3.select(this).append("title")
                .text(`${ageGroup}: ${value}`);
        })
        .on("mouseout", function() {
            d3.select(this).select("title").remove();
        });
}