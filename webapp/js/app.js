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

requirejs(['spin.min', 'cartodb',
           'app/config','app/state', 'app/d3viz', 'app/templates'],
function(spin, dummy, config, state, d3viz, templates) {
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
        if (state.prevSeccion !== $(this)) $('#overlay').css('left', '100%');
        state.prevSeccion = $(this);

        var seccion_nombre = $(this).html();
        //JET: get the bounds of the section to sync the map accordingly
        var t = $(this).data('bounds');
        var b = new L.LatLngBounds(new L.LatLng(t[0][1], t[0][0]),
                                   new L.LatLng(t[1][1], t[1][0]));
        var z = state.map.fitBounds(b);
        //TODO: What does the get method stands for?
        new Spinner(config.SPINNER_OPTS).spin($('#secciones-establecimientos').get(0))
        //JET: store previous scrollTop position
        state.prevScrollTop = $('#filter').scrollTop();
        //JET: scroll to the beginning
        $('#filter').scrollTop(0);
        //JET: push the section container out of sight with an animation
        $('#secciones-container').css('left', '-150px');
        config.sql.execute(config.ESTABLECIMIENTOS_SQL_TMPL,
                    {
                        id_seccion: $(this).data('id_seccion'),
                        id_distrito: $(this).data('id_distrito')
                    })
            .done(function(data) {
                var h = config.SECCIONES_ESTABLECIMIENTOS_TMPL({
                    seccion: seccion_nombre,
                    establecimientos: data.rows
                });
                $('#secciones-establecimientos').html(h);
            });
    });

    $(".creditos").click(function(){
        $(".creVent").fadeIn(200);
        $(".creVent .txts").delay(300).fadeIn(200);
    });

    $(".cerrar").click(function(){
        $(".creVent .txts").fadeOut(200);
        $(".creVent").delay(300).fadeOut(200);
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
        start();
      });
    });

    state.map = L.map('mapa_cont', {
        center: [-34.61597432902992, -58.442115783691406],
        zoom: 12,
        minZoom: 12,
        maxZoom: 16,
        attributionControl: false
    });

    //mbUrl = 'https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png';

    //var terreno = L.tileLayer(mbUrl, {id: 'olcreativa.c409ba3f', attribution: mbAttr}),

    //var mapboxUrl = 'http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png';
    var mapboxUrl = config.cdn_proxy+'https://{s}.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={token}';
    //L.tileLayer(mapboxUrl, {attribution: "OpenStreetMaps"}).addTo(state.map);
    L.tileLayer(mapboxUrl, {
                            id: 'olcreativa.c409ba3f', 
                            attribution: "OpenStreetMaps", 
                            token: 'pk.eyJ1Ijoib2xjcmVhdGl2YSIsImEiOiJEZWUxUmpzIn0.buFJd1-sVkgR01epcQz4Iw'}).addTo(state.map);
    var _a = new L.Control.Attribution( { position: 'topright', prefix: false} );
    _a.addAttribution(config.atrib_top);
    _a.addTo(state.map);
    (new L.Control.Attribution({position: 'bottomright', prefix: false})).addAttribution(config.attrib_bottom).addTo(state.map);

    //JET: compile template for the description of a given polling station
    var popup_tmpl = _.template(templates.popup);
    //JET: compile template for the results of a given polling station
    var overlay_tmpl = Handlebars.compile(templates.overlay);
    
    //JET: Keep state

    config.sql = new cartodb.SQL({
        user: config.CARTODB_USER
    });

    //JET: compile template for the polling stations list under each section
    config.SECCIONES_ESTABLECIMIENTOS_TMPL = _.template(templates.polling);

    var FEATURE_CLICK_SQL_TMPL = _.template(templates.feature_click_sql);

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
            featureClick(e, latlng, state.map.latLngToLayerPoint(latlng), d, 0);
            state.map.setView(latlng, 14);
        }
    }, '#secciones-establecimientos a');

    //Click on "volver"
    $(document).on({
        click: function(e) {
            //JET: restore the section view with animation
            $('#secciones-container').css('left', '5px');
            //JET: restore previous scrollPosition
            $('#filtro').scrollTop(state.prevScrollTop);
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
    state.map.on('dragend', function(e, x, y) {
        if (state.current_ltlng !== null && !state.map.getBounds().contains(state.current_ltlng)) {
            hideOverlay();
        }
    });

    //JET: 
    state.map.on('popupclose', function() {
        if (state.featureClicked) state.featureClicked = false;
    });

    //JET: if we are over a polling station change cursor to pointer
    var featureOver = function(e, latlng, pos, data, layerNumber) {
        $('#map').css('cursor', 'pointer');
    };

    //JET: reset when we are not over a polling station
    var featureOut = function(e, layer) {
        $('#map').css('cursor', 'auto');
    };


    //JET: Called when the Cartodb SQL has finished
    var featureClickDone = function(latlng, establecimiento_data, votos_data) {
        var popup = L.popup()
            .setLatLng(latlng)
            .setContent(popup_tmpl({establecimiento: establecimiento_data,
                                    distritos: config.distritos}))
            .openOn(state.map);

        var d = votos_data.rows;
        d.forEach(function(d) {
            d.pct = (d.votos / establecimiento_data.positivos) * 100;
        });
        console.log(d)
        $('#results').html(overlay_tmpl({
            e: establecimiento_data,
            data: d,
            dict_partidos: config.dicc_partidos,
            max: get_max_obj(d, 'pct')

            }));
        animate_barras()
        // $('#overlay *').fadeIn(200);
        // d3viz.barchart(d);
    };

    //JET: 
    var featureClick = function(event, latlng, pos, establecimiento_data, layerIndex) {
        //JET: 
        $('#overlay *').fadeOut(200, function() { $(this).remove(); });
        //JET: change the get(0) call since it seems it is slower 
        // https://learn.jquery.com/using-jquery-core/faq/how-do-i-pull-a-native-dom-element-from-a-jquery-object/
        setTimeout(function() { new Spinner(config.SPINNER_OPTS).spin($('#overlay')[0]) }, 200);
        showOverlay();
        state.current_ltlng = latlng;
        //JET: It seems that the decision was to not center the map on each click when interacting
        // with the map itself
        state.map.panTo(latlng);
        setTimeout(function() {
            //TODO: Couldn't this be done in a single step?
            var query = FEATURE_CLICK_SQL_TMPL({
                establecimiento: establecimiento_data
            });
            config.sql.execute(query, establecimiento_data)
                //JET: partially apply a function http://underscorejs.org/#partial
                .done(_.partial(featureClickDone, latlng, establecimiento_data))
                .error(function(errors) {
                  // errors contains a list of errors
                });
        }, 200);
    };

    

    //JET: Creating viz at runtime
    //http://docs.cartodb.com/cartodb-platform/cartodb-js.html#creating-visualizations-at-runtime
    cartodb.createLayer(state.map, {
         user_name: config.CARTODB_USER,
         type: 'cartodb',
         sublayers: [{
             sql: config.LAYER_SQL,
             //JET: Use the cartocss underscore template and pass it to the layer
             cartocss: CARTOCSS_TMPL({ colores: config.PARTIDOS_COLORES }),
             //TODO: Check interactivity
             interactivity: 'id_establecimiento,nombre,direccion,id_distrito,id_seccion, \
                            circuito,mesa_desde, mesa_hasta, electores, \
                            votantes, positivos, id_partido, votos, \
                            margin_victory, sqrt_positivos',
             //interactivity: 'nombre,direccion,distrito_id,seccion_id,circuito,mesa_desde,mesa_hasta, electores, votantes, positivos,total_parcodigo,vot_id_partido,margin_of_victory, sqrt_positivos',
         }]
     })
      .addTo(state.map)
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
