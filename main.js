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
    let selectedSubstances = []; 

    generateGraph(data, selectedAges, usageType, selectedSubstances);

    d3.select("#usage-type-dropdown").on("change", function() {
        usageType = this.value;
        generateGraph(data, selectedAges, usageType, selectedSubstances);
    });

    d3.selectAll("#age-selection input[type='checkbox']").on("change", function() {
        selectedAges = Array.from(d3.selectAll("#age-selection input[type='checkbox']:checked"))
                            .map(d => d.value);
        generateGraph(data, selectedAges, usageType, selectedSubstances);
    });

    d3.selectAll("#substance-selection input[type='checkbox']").on("change", function() {
        selectedSubstances = Array.from(d3.selectAll("#substance-selection input[type='checkbox']:checked"))
                                  .map(d => d.value);
        generateGraph(data, selectedAges, usageType, selectedSubstances);
    });
});

function generateGraph(data, selectedAges, usageType, selectedSubstances) {
    const margin = { top: 60, right: 100, bottom: 60, left: 60 }; 
    const width = 900 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("svg");
    svg.selectAll("*").remove();
    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const filteredData = data.filter(d => selectedAges.includes(d.age));

    const allSubstances = [
        'alcohol_use', 'marijuana_use', 'cocaine_use', 'crack_use', 'heroin_use',
        'hallucinogen_use', 'inhalant_use', 'pain_releiver_use', 'oxycontin_use',
        'tranquilizer_use', 'stimulant_use', 'meth_use', 'sedative_use'
    ];

    const substances = selectedSubstances.length > 0 ? selectedSubstances : allSubstances;

    const colors = d3.scaleOrdinal(d3.schemeCategory10).domain(selectedAges);

    const maxValue = d3.max(filteredData, d =>
        d3.sum(substances, substance =>
            usageType === 'percentage' ? d[`${substance}`] : d[`${substance.replace('_use', '_frequency')}`]
        )
    ) * 7;

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

    const yAxisTitle = svg.selectAll(".y-axis-title")
        .data([usageType]) 
        .join("text")
        .attr("class", "y-axis-title")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${margin.left / 2.4}, ${height / 2}) rotate(-90)`)
        .text(usageType === 'percentage' ? 'Percentage of Population Usage' : 'Frequency of Usage')
        .style("font-size", "16px")
        .style("font-weight", "bold");

    svg.append("text")
        .attr("class", "x-axis-title")
        .attr("text-anchor", "middle")
        .attr("x", margin.left + width / 2)
        .attr("y", margin.top + height + 40)
        .text("Drugs")
        .style("font-size", "16px")
        .style("font-weight", "bold");

    svg.append("text")
        .attr("class", "chart-title")
        .attr("text-anchor", "middle")
        .attr("x", margin.left + width / 2)
        .attr("y", margin.top - 20)
        .text("How Do Various Drug Usages Change Across Different Age Groups?")
        .style("font-size", "20px")
        .style("font-weight", "bold");

    const legend = svg.append("g")
        .attr("transform", `translate(${width + 60}, 0)`);

    selectedAges.forEach((age, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", colors(age));
        
        legend.append("text")
            .attr("x", 20)
            .attr("y", i * 20 + 12)
            .text(age);
    });

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
        .attr("width", xScale.bandwidth())
        .attr("y", height)
        .transition()
        .duration(800)
        .attr("y", d => yScale(d[1]))
        .attr("height", d => yScale(d[0]) - yScale(d[1]));


    g.selectAll("rect")
        .on("mouseover", function(event, d) {
            const ageGroup = d3.select(this.parentNode).datum().key;
            const value = (d[1] - d[0]).toFixed(2);
            
            const substance = d.data; 
            const label = substance.replace('_use', '').replace('_frequency', '');

            const usageLabel = usageType === 'percentage' ? 'Sub-Population Usage' : 'Sub-Population Median Annual Usages Among Users';
            const usageValue = usageType === 'percentage' ? `${value}%` : value; 
            
            d3.select("#tooltip")
                .style("opacity", 1)
                .html(`<strong>Age Group:</strong> ${ageGroup}<br>
                    <strong>Substance:</strong> ${label}<br>
                    <strong>${usageLabel}:</strong> ${usageValue}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", function(event) {
            d3.select("#tooltip")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("opacity", 0);
        });
}