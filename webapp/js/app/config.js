define({
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
    CARTODB_USER: 'lndata',
    sql: null,
    //JET: Cartodb SQL template
    LAYER_SQL: "SELECT * FROM cache_votos_paso_2015 order by (margin_victory / sqrt_positivos) desc",
    ESTABLECIMIENTOS_SQL_TMPL: "SELECT *, st_asgeojson(the_geom) as g \n \
                                 FROM cache_votos_paso_2015 \n \
                                 WHERE id_distrito = {{id_distrito}} \n \
                                 AND id_seccion = {{id_seccion}} \n \
                                 ORDER BY circuito, nombre",
    distritos: null,
    dicc_partidos: null,
    cdn_proxy: ""
});