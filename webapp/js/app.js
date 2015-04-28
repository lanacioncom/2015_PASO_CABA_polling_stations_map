requirejs.config({
    //By default load any module IDs from js/lib
    baseUrl: 'libs',
    //except, if the module ID starts with "app",
    //load it from the js/app directory. paths
    //config is relative to the baseUrl, and
    //never includes a ".js" extension since
    //the paths config could be for a directory.
    paths: {
        'app': '../js/app',
        'templates': '../templates',
        'text': 'plugins/text'
    }
});

requirejs(['spin.min', 'cartodb', 'd3.min', 'app/config', 'app/templates'],
function(spin, dummy, d3, config, templates) {
  function start() {
    //JET: underscore template function returns a function so we are calling it on the fly
    // we have not compiled this since it is used only once.
    //_.template($('#secciones-template').html())({distritos: DISTRITOS })
    $('#filter').html( _.template(templates.sections)({distritos: config.distritos }));

    //JET: toggle sections visibility on a given district
    $('#filter h1').on('click', function(e) {
        var ul = $(this).next('ul');
        //TODO: jquery sugar
        // specify a context to the jquery selector 
        // http://api.jquery.com/jquery/#jQuery-selector-context
        var span = $('span', $(this));
        if (ul.css('display') == 'block') {
            span.html('▸'); ul.css('display', 'none');
        }
        else {
            span.html('▾'); ul.css('display', 'block');
        }
    });

    //JET: click on a section
    $('#filter a').on('click', function(e) {
        //JET: prevent default navigation
        e.preventDefault();
        //JET: if we are clicking on the same section hide the overlay
        if (prevSeccion !== $(this)) hideOverlay();
        prevSeccion = $(this);

        var seccion_nombre = $(this).html();
        //JET: get the bounds of the section to sync the map accordingly
        var t = $(this).data('bounds');
        var b = new L.LatLngBounds(new L.LatLng(t[0][1], t[0][0]),
                                   new L.LatLng(t[1][1], t[1][0]));
        var z = map.fitBounds(b);
        //TODO: What does the get method stands for?
        new Spinner(SPINNER_OPTS).spin($('#secciones-establecimientos').get(0))
        //JET: store previous scrollTop position
        prevScrollTop = $('#filter').scrollTop();
        //JET: scroll to the beginning
        $('#filter').scrollTop(0);
        //JET: push the section container out of sight with an animation
        $('#secciones-container').css('left', '-150px');
        sql.execute(ESTABLECIMIENTOS_SQL_TMPL,
                    {
                        seccion_id: $(this).data('seccion_id'),
                        distrito_id: $(this).data('distrito_id')
                    })
            .done(function(data) {
                var h = SECCIONES_ESTABLECIMIENTOS_TMPL({
                    seccion: seccion_nombre,
                    establecimientos: data.rows
                });
                $('#secciones-establecimientos').html(h);
            });
    });
  };
  $(function() {
    "use strict";

    //JET: Load sections
    $.get("data/comunas.json", function(comunas) {
      config.distritos = comunas;
      //JET: Load parties dictionary 
      $.get("data/diccionario_partidos.json", function(data){
        config.dicc_partidos = data;
        start()
      });
    });

    var map = L.map('map', {
        center: [-34.61597432902992, -58.442115783691406],
        zoom: 9,
        minZoom: 9,
        maxZoom: 16,
        attributionControl: false
    });
    var mapboxUrl = 'http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png';
    L.tileLayer(mapboxUrl, {attribution: "OpenStreetMaps"}).addTo(map);
    var _a = new L.Control.Attribution( { position: 'topright', prefix: false} );
    _a.addAttribution(config.atrib_top);
    _a.addTo(map);
    (new L.Control.Attribution({position: 'bottomright', prefix: false})).addAttribution(config.attrib_bottom).addTo(map);

    //JET: compile template for the description of a given polling station
    var popup_tmpl = _.template(templates.popup);
    //JET: compile template for the results of a given polling station
    var overlay_tmpl = _.template(templates.overlay);
    
    //JET: Keep state
    var current_ltlng = null;
    var featureClicked = false;
    var prevScrollTop = 0;
    var prevSeccion = null;

    var CARTODB_USER = 'lndata';

    var sql = new cartodb.SQL({
        user: CARTODB_USER
    });

    //JET: compile template for the polling stations list under each section
    var SECCIONES_ESTABLECIMIENTOS_TMPL = _.template(templates.polling);

    var FEATURE_CLICK_SQL_TMPL = _.template("SELECT p.descripcion, v.id_partido, SUM(v.votospartido) \
                                              FROM votos_paso_caba_2015 v \
                                              LEFT OUTER JOIN partidos_paso_caba_2015 p ON p.id = v.id_partido \
                                              WHERE v.id_mesa >= {{mesa_desde}} \
                                              AND v._id_mesa <= {{mesa_hasta}} \
                                              AND v.id_comuna = <%- establecimiento.seccion_id %> \
                                              AND v.id_distrito = <%- establecimiento.distrito_id %> \
                                              GROUP BY v.id_partido, p.descripcion \
                                              ORDER BY SUM(v.votospartido) DESC");

    

    //Click on a polling station link 
    $(document).on({
        click: function(e) {
            //Clear default event
            e.preventDefault();
            var point = _.map($(this).data('point').split(','), parseFloat);
            var latlng = L.latLng(point[1], point[0]);
            //JET: Access html5 data attributes https://api.jquery.com/data/
            var d = JSON.parse(atob($(this).data('establecimiento')));
            //JET: Call the feature click function like on the map
            featureClick(e, latlng, map.latLngToLayerPoint(latlng), d, 0);
            map.setView(latlng, 14);
        }
    }, '#secciones-establecimientos a');

    //Click on "volver"
    $(document).on({
        click: function(e) {
            //JET: restore the section view with animation
            $('#secciones-container').css('left', '5px');
            //JET: restore previous scrollPosition
            $('#filtro').scrollTop(prevScrollTop);
        }
    }, '#secciones-establecimientos button');


    var CARTOCSS_TMPL = _.template(templates.cartocss);

    //JET: close credit window
    $('#credits button').on('click', function(e) {
        e.preventDefault();
        $('#credits').css('visibility', 'hidden');
        return false;
    });

    //JET: hide overlay by shifting to the left with animation
    var hideOverlay = function() {
        $('#overlay').css('left', '100%');
    };
    //JET: show overlay by shifting to the left with animation
    var showOverlay = function() {
        $('#overlay').css('left', '73%');
    };

    //JET: If we move the map manually and the overlay falls out of bounds hide overlay
    map.on('dragend', function(e, x, y) {
        if (current_ltlng !== null && !map.getBounds().contains(current_ltlng)) {
            hideOverlay();
        }
    });

    //JET: 
    map.on('popupclose', function() {
        if (featureClicked) featureClicked = false;
    });

    //JET: if we are over a polling station change cursor to pointer
    var featureOver = function(e, latlng, pos, data, layerNumber) {
        $('#map').css('cursor', 'pointer');
    };

    //JET: reset when we are not over a polling station
    var featureOut = function(e, layer) {
        $('#map').css('cursor', 'auto');
    };

    //TODO: D3 Visualization
    var barChart = function(data) {
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
                                    function(d) { return d.sum; }))])
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
                return PARTIDOS_COLORES[parseInt(d.vot_id_partido)];
            })
            .attr("width", function(d) { return scale(d.sum); });

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
            .text(function(d) { return d.pct.toFixed(2) + '% - ' + d.sum + ' votos'; });

        svg.append('g').selectAll("text")
            .data(data)
            .enter()
            .append('text')
            .attr('x', 0)
            .attr('y', function(d,i) { return i * 27 + 15; })
            .style('font-size', '10px')
            .style('fill', 'black')
            .style('font-family', 'Helvetica, Arial, sans-serif')
            .text(function(d) { return d.pardenominacion; });
    };

    //JET: Called when the Cartodb SQL has finished
    var featureClickDone = function(latlng, establecimiento_data, votos_data) {
        var popup = L.popup()
            .setLatLng(latlng)
            .setContent(popup_tmpl({establecimiento: establecimiento_data}))
            .openOn(map);

        var d = votos_data.rows.slice(0,4);
        d.forEach(function(d) {
            d.pct = (d.sum / establecimiento_data.positivos) * 100;
        });
        var sum_otros = _.reduce(votos_data.rows.slice(4), function(m, s) { return m + s.sum; }, 0);
        d[4] = {
            pardenominacion: 'Otros',
            sum: sum_otros,
            id_partido: 9999,
            pct: (sum_otros / establecimiento_data.positivos) * 100
        };

        $('#overlay').html(overlay_tmpl({
            establecimiento: establecimiento_data,
            //JET: I don't think 'escrutinio' is used
            escrutinio: d
        }));
        $('#overlay *').fadeIn(200);
        barChart(d);
    };

    //JET: 
    var featureClick = function(event, latlng, pos, establecimiento_data, layerIndex) {
        //JET: 
        $('#overlay *').fadeOut(200, function() { $(this).remove(); });
        //JET: change the get(0) call since it seems it is slower 
        // https://learn.jquery.com/using-jquery-core/faq/how-do-i-pull-a-native-dom-element-from-a-jquery-object/
        setTimeout(function() { new Spinner(SPINNER_OPTS).spin($('#overlay')[0]) }, 200);
        showOverlay();
        current_ltlng = latlng;
        //JET: It seems that the decision was to not center the map on each click when interacting
        // with the map itself
        //map.panTo(latlng);
        setTimeout(function() {
            //TODO: Couldn't this be done in a single step?
            var query = FEATURE_CLICK_SQL_TMPL({
                votacion: 'paso_caba_2015',
                establecimiento: establecimiento_data
            });
            sql.execute(query, establecimiento_data)
                //JET: partially apply a function http://underscorejs.org/#partial
                .done(_.partial(featureClickDone, latlng, establecimiento_data))
                .error(function(errors) {
                  //TODO: Remove line
                  var a = ll;
                  // errors contains a list of errors
                });
        }, 200);
    };
    //JET: Creating viz at runtime
    //http://docs.cartodb.com/cartodb-platform/cartodb-js.html#creating-visualizations-at-runtime
    cartodb.createLayer(map, {
         user_name: CARTODB_USER,
         type: 'cartodb',
         sublayers: [{
             sql: config.LAYER_SQL,
             //JET: Use the cartocss underscore template and pass it to the layer
             cartocss: CARTOCSS_TMPL({ colores: config.PARTIDOS_COLORES }),
             //TODO: Check interactivity
             interactivity: 'nombre,direccion,distrito_id,seccion_id,circuito,mesa_desde,mesa_hasta, electores, votantes, positivos,total_parcodigo,vot_id_partido,margin_of_victory, sqrt_positivos',
             //interactivity: 'nombre,direccion,distrito_id,seccion_id,circuito,mesa_desde,mesa_hasta, electores, votantes, positivos,total_parcodigo,vot_id_partido,margin_of_victory, sqrt_positivos',
         }]
     })
      .addTo(map)
      .on('done', function(layer) {
          config.carto_layers['2015_caba_paso'] = layer;
          layer.setInteraction(true);
          layer.on('featureOver', featureOver)
              .on('featureOut', featureOut)
              .on('featureClick', featureClick);
      });
  });
});

//JET: Execute when document ready
// from here https://api.jquery.com/ready/
