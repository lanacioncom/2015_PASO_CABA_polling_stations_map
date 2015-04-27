function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

var SPINNER_OPTS = {
        lines: 13, // The number of lines to draw
        length: 10, // The length of each line
        width: 3, // The line thickness
        radius: 10, // The radius of the inner circle
        corners: 1, // Corner roundness (0..1)
        rotate: 0, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        color: '#000', // #rgb or #rrggbb
        speed: 1.1, // Rounds per second
        trail: 60, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: true, // Whether to use hardware acceleration
        className: 'spinner', // The CSS class to assign to the spinner
        zIndex: 2e9, // The z-index (defaults to 2000000000)
        top: 'auto', // Top position relative to parent in px
        left: 'auto' // Left position relative to parent in px
    };

var PARTIDOS_COLORES = {
    18:'#FEDB30', // PRO
    16:'#7CC374', // ECO
    23:'#1796D7', // FPV
    24:'#D6BBEA', // Fte. por Buenos Aires
    25:'#C5C8CB', // SURGEN
    35:'#C5C8CB', // Es posible
    22:'#C5C8CB', // Camino Popular
    17:'#C5C8CB', // Fte. de Izquierda
    20:'#C5C8CB', // Bien Común
    26:'#C5C8CB', // Alz. A. Buenos Aires
    21:'#F4987E', // MST
    82:'#C5C8CB', // MAS
    61:'#C5C8CB', // Partido Humanista
    80:'#1f77b4', // Bandera Vecinal
    19:'#1f77b4', // Movimiento Federal
    81:'#1f77b4', // Autod. y Libertad
    9999: '#aaaaaa'
};
    
var carto_layers = { '2015_caba_paso': null}

//JET: Cartodb SQL template
var LAYER_SQL = "SELECT * FROM cache_votos_paso_2015";
var ESTABLECIMIENTOS_SQL_TMPL = "SELECT *, st_asgeojson(the_geom) as g \n
                                 FROM cache_votos_paso_2015 \n
                                 WHERE distrito_id = {{distrito_id}} \n
                                 AND seccion_id = {{seccion_id}} \n
                                 ORDER BY circuito, nombre";

var distritos = null;
var dicc_partidos = null;
//JET: Execute when document ready
// from here https://api.jquery.com/ready/
$(function() {
    "use strict";

    //JET: Load sections
    $.get("data/comunas.json", function(comunas) {
      DISTRITOS = comunas;
      //JET: Load parties dictionary 
      $.get("data/diccionario_partidos.json", function(data){
        dicc_partidos = data;
      });
    });

    map = L.map('map', {
        center: [-34.61597432902992, -58.442115783691406],
        zoom: 9,
        minZoom: 9,
        maxZoom: 16,
        attributionControl: false
    });
    var mapboxUrl = 'http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png';
    L.tileLayer(mapboxUrl, {attribution: "OpenStreetMaps"}).addTo(map);
    var _a = new L.Control.Attribution( { position: 'topright', prefix: false} );
    _a.addAttribution('LaNacion.com — <a href="#" onclick="$(\'#credits\').css(\'visibility\', \'visible\'); return false;" id="showcredits"><strong>Creditos</strong></a>');
    _a.removeAttribution("CartoDB <a href='http://cartodb.com/attributions' target='_blank'>attribution</a>");
    _a.addTo(map);
    (new L.Control.Attribution({position: 'bottomright', prefix: false})).addAttribution('Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">').addTo(map);

    //JET: compile template for the description of a given polling station
    var popup_tmpl = _.template($('#popup-template').html());
    //JET: compile template for the results of a given polling station
    var overlay_tmpl = _.template($('#overlay-template').html());
    
    //JET: Keep state
    var current_ltlng = null;
    var featureClicked = false;
    var prevScrollTop = 0;
    var prevSeccion = null;

    var CARTODB_USER = 'lndata';

    sql = new cartodb.SQL({
        user: CARTODB_USER
    });

    //JET: compile template for the polling stations list under each section
    var SECCIONES_ESTABLECIMIENTOS_TMPL = _.template($('#secciones-establecimientos-template').html());

    var FEATURE_CLICK_SQL_TMPL = _.template("SELECT p.descripcion, v.vot_id_partido, SUM(votvotospartido) \
                                              FROM votos_paso_caba_2015 v \
                                              LEFT OUTER JOIN partidos_paso_caba_2015 p ON p.id = v.vot_id_partido \
                                              WHERE vot_mescodigomesa >= {{mesa_desde}} \
                                              AND vot_mescodigomesa <= {{mesa_hasta}} \
                                              AND vot_depcodigodepartamento = <%- establecimiento.seccion_id %> \
                                              AND vot_procodigoprovincia = <%- establecimiento.distrito_id %> \
                                              AND votacion = '<%- votacion %>' \
                                              GROUP BY vot_id_partido, p.descripcion \
                                              ORDER BY SUM(votvotospartido) DESC");
    //JET: underscore template function returns a function so we are calling it on the fly
    // we have not compiled this since it is used only once.
    //_.template($('#secciones-template').html())({distritos: DISTRITOS })
    $('#filtro').html(_.template($('#secciones-template').html())({distritos: DISTRITOS }));

    //JET: toggle sections visibility on a given district
    $('#filtro h1').on('click', function(e) {
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
    $('#filtro a').on('click', function(e) {
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
        prevScrollTop = $('#filtro').scrollTop();
        //JET: scroll to the beginning
        $('#filtro').scrollTop(0);
        //JET: push the section container out of sight with an animation
        $('#secciones-container').css('left', '-150px');
        sql.execute(ESTABLECIMIENTOS_SQL_TMPL,
                    {
                        //TODO: jquery data attributes
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





    var CARTOCSS_TMPL = _.template(' \
      #establecimientos_paso_2015_caba { \n \
      marker-opacity: 0.7; \n \
      marker-allow-overlap: true; \n \
      marker-line-width: 0; \n \
      marker-line-opacity: 1; \n \
      [zoom = 6] { \n \
        marker-width: 5 + ([margin_of_victory] / [sqrt_positivos]) * 1; \n \
        <% _.each(_.pairs(colores), function(p) { %> \n \
        [id_partido=<%- p[0] %>] { \n \
          marker-fill: <%- p[1] %>; \n \
          marker-line-color: <%- p[1] %>; \n \
        } \n \
        <% }); %> \n \
      } \n \
      [zoom = 7] { \n \
      marker-width: 5 + ([margin_of_victory] / [sqrt_positivos]) * 2; \n \
      <% _.each(_.pairs(colores), function(p) { %> \n \
        [id_partido=<%- p[0] %>] { \n \
        marker-fill: <%- p[1] %>; \n \
        marker-line-color: <%- p[1] %>; \n \
        } \n \
        <% }); %> \n \
      } \n \
      [zoom = 8] { \n \
      marker-width: 5 + ([margin_of_victory] / [sqrt_positivos]) * 4; \n \
      <% _.each(_.pairs(colores), function(p) { %> \n \
      [id_partido=<%- p[0] %>] { \n \
      marker-fill: <%- p[1] %>; \n \
      marker-line-color: <%- p[1] %>; \n \
      } \n \
      <% }); %> \n \
      } \n \
      [zoom = 9] { \n \
      marker-width: 5 + ([margin_of_victory] / [sqrt_positivos]) * 8; \n \
      <% _.each(_.pairs(colores), function(p) { %> \n \
      [id_partido=<%- p[0] %>] { \n \
      marker-fill: <%- p[1] %>; \n \
      marker-line-color: <%- p[1] %>; \n \
      } \n \
      <% }); %> \n \
      } \n \
      [zoom = 10] { \n \
      marker-width: 5 + ([margin_of_victory] / [sqrt_positivos]) * 16; \n \
      <% _.each(_.pairs(colores), function(p) { %> \n \
      [id_partido=<%- p[0] %>] { \n \
      marker-fill: <%- p[1] %>; \n \
      marker-line-color: <%- p[1] %>; \n \
      } \n \
      <% }); %> \n \
      } \n \
      [zoom = 11] { \n \
      marker-width: 5 + ([margin_of_victory] / [sqrt_positivos]) * 32; \n \
      <% _.each(_.pairs(colores), function(p) { %> \n \
      [id_partido=<%- p[0] %>] { \n \
      marker-fill: <%- p[1] %>; \n \
      marker-line-color: <%- p[1] %>; \n \
      } \n \
      <% }); %> \n \
      } \n \
      [zoom = 12] { \n \
      marker-width: 5 + ([margin_of_victory] / [sqrt_positivos]) * 64; \n \
      <% _.each(_.pairs(colores), function(p) { %> \n \
      [id_partido=<%- p[0] %>] { \n \
      marker-fill: <%- p[1] %>; \n \
      marker-line-color: <%- p[1] %>; \n \
      } \n \
      <% }); %> \n \
      } \n \
      [zoom = 13] { \n \
      marker-width: 5 + ([margin_of_victory] / [sqrt_positivos]) * 100; \n \
      <% _.each(_.pairs(colores), function(p) { %> \n \
      [id_partido=<%- p[0] %>] { \n \
      marker-fill: <%- p[1] %>; \n \
      marker-line-color: <%- p[1] %>; \n \
      } \n \
      <% }); %> \n \
      } \n \
      [zoom >= 14] { \n \
      marker-width: 5 + ([margin_of_victory] / [sqrt_positivos]) * 128; \n \
      <% _.each(_.pairs(colores), function(p) { %> \n \
      [id_partido=<%- p[0] %>] { \n \
      marker-fill: <%- p[1] %>; \n \
      marker-line-color: <%- p[1] %>; \n \
      } \n \
      <% }); %> \n \
      } \n \
      }'
    );

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
            vot_id_partido: 9999,
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
             sql: LAYER_SQL,
             //JET: Use the cartocss underscore template and pass it to the layer
             cartocss: CARTOCSS_TMPL({ colores: PARTIDOS_COLORES }),
             //TODO: Check interactivity
             interactivity: 'nombre,direccion,distrito_id,seccion_id,circuito,mesa_desde,mesa_hasta, electores, votantes, positivos,total_parcodigo,vot_id_partido,margin_of_victory, sqrt_positivos',
             //interactivity: 'nombre,direccion,distrito_id,seccion_id,circuito,mesa_desde,mesa_hasta, electores, votantes, positivos,total_parcodigo,vot_id_partido,margin_of_victory, sqrt_positivos',
         }]
     })
      .addTo(map)
      .on('done', function(layer) {
          carto_layers['2015_caba_paso'] = layer;
          layer.setInteraction(true);
          layer.on('featureOver', featureOver)
              .on('featureOut', featureOut)
              .on('featureClick', featureClick);
      });
});