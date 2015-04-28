define(["d3.min", "app/config"],
    function(d3, config) {
        //return a function to define "foo/title".
        //It gets or sets the window title.
        return function(data) {
            var h = 300;
            //Chart selector inside the overlay
            var svg = d3.select("#overlay .chart")
                .append("svg")
                .attr('viewBox', '0 0 100 160')
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("width", '100%')
                .attr("height", '100%');


            var scale = d3.scale.linear()
                //JET: get the maximum of all the sums of votes
                .domain([0, _.max(_.map(data,
                                        function(d) { return d.votos; }))])
                .range([0, 100]);

            svg.selectAll("rect")
                .data(data)
                .enter()
                .append("rect")
                .attr("x", 0)
                .attr("y", function(d, i) {
                    return i * 27 + 18;
                })
                .attr("height", 10)
                .attr("fill", function(d) {
                    return config.PARTIDOS_COLORES[parseInt(d.id_partido)];
                })
                .attr("width", function(d) { return scale(d.votos); });

            svg.selectAll("text")
                .data(data)
                .enter()
                .append('text')
                .attr('x', function(d) { return scale(d.sum) + 5; } )
                .attr('y', function(d,i) { return i * 27 + 27; })
                //JET: Change style attr to style
                .style('font-size', '10px')
                .style('fill', '#555')
                .style('font-family', 'Helvetica, Arial, sans-serif')
                .text(function(d) { return d.pct.toFixed(2) + '% - ' + d.votos + ' votos'; });

            svg.append('g').selectAll("text")
                .data(data)
                .enter()
                .append('text')
                .attr('x', 0)
                .attr('y', function(d,i) { return i * 27 + 15; })
                .style('font-size', '10px')
                .style('fill', 'black')
                .style('font-family', 'Helvetica, Arial, sans-serif')
                .text(function(d) { return d.partido; });
        }
    }
);