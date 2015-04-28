define({
    SPINNER_OPTS: {
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
    },
    PARTIDOS_COLORES: {
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
    },
    carto_layers:{ '2015_caba_paso': null},

    //JET: Cartodb SQL template
    LAYER_SQL: "SELECT * FROM cache_votos_paso_2015",
    ESTABLECIMIENTOS_SQL_TMPL: "SELECT *, st_asgeojson(the_geom) as g \n \
                                 FROM cache_votos_paso_2015 \n \
                                 WHERE distrito_id = {{distrito_id}} \n \
                                 AND seccion_id = {{seccion_id}} \n \
                                 ORDER BY circuito, nombre",

    distritos: null,
    dicc_partidos: null,

    atrib_top: "LaNacion.com — <a href=\"#\" onclick=\"$('#credits').css('visibility', 'visible'); \
                return false;\" id=\"showcredits\"><strong>Créditos</strong></a>",

    attrib_bottom: "Tiles Courtesy of <a href=\"http://www.mapquest.com/\" target=\"_blank\"> \
                    MapQuest</a> <img src=\"http://developer.mapquest.com/content/osm/mq_logo.png\">"
});