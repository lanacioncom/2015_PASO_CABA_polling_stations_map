# coding: utf-8
import dataset
import csv
import os

db = None
dir = os.path.dirname(__file__)
REL_POLLING_PATH = os.path.join(dir, '../data/maestras')
REL_RESULTS_PATH = os.path.join(dir, '../data/resultados')
POLLING_STATIONS_DATA_FILE = 'caba_est_2015.csv'
POLLING_TABLES_DATA_FILE = 'mesas.csv'
RESULTS_DATA_FILE = 'resultados_partido_lista.csv'


SCHEMA_POLLING_STATION_NUMERIC = {
    "caba_id": "id_caba",
    "distrito_id": "id_distrito",
    "seccion_id": "id_seccion",
    "mesa_desde": "mesa_desde",
    "mesa_hasta": "mesa_hasta",
    "num_mesas": "num_mesas"
}

SCHEMA_POLLING_TABLE_NUMERIC = {
    "id_mesa": "id_mesa",
    "id_establecimiento": "id_establecimiento_gob",
    "id_centro_de_distribucion": "id_centro",
    "ciudadanos_habilitados": "electores"
}

SCHEMA_RESULTS_NUMERIC = {
    "id_mesa": "id_mesa",
    "cantidad_votantes": "electores",
    "sobres_utilizados": "votantes",
    "JEF": "votos"
}

SPECIAL_PARTIES = {
    "BLC": 0,
    "NUL": 1,
    "IMP": 1,
    "REC": 1
}


def connect_dataset():
    '''DB connection setup'''
    return dataset.connect('postgresql://jjelosua@localhost:5432/pasocaba2015')


def clearDB():
    ''' Clears the DB to make the script idempotent '''
    for t in db.tables:
        print t
        db.get_table(t).drop()


def import_poll_stations(fname):
    ''' import geolocated polling stations'''
    t = db['locales']
    f = open(fname, 'r')
    fields = f.readline().strip().split(',')
    c = csv.DictReader(f, fields)
    results = []
    for row in c:
        t_results = {}
        for k, v in row.iteritems():
            if k in SCHEMA_POLLING_STATION_NUMERIC.keys():
                kt = SCHEMA_POLLING_STATION_NUMERIC[k]
                t_results[kt] = int(v) if v else None
            if k not in SCHEMA_POLLING_STATION_NUMERIC.keys():
                if k == "geom":
                    t_results[k] = v
                else:
                    t_results[k] = v.decode('utf-8')
        results.append(t_results)
    t.insert_many(results)


def import_poll_tables(fname):
    ''' import polling tables CSV '''
    t = db['mesas']
    f = open(fname, 'r')
    fields = f.readline().strip().split(',')
    c = csv.DictReader(f, fields)
    results = []
    for row in c:
        t_results = {}
        for k, v in row.iteritems():
            if k in SCHEMA_POLLING_TABLE_NUMERIC.keys():
                kt = SCHEMA_POLLING_TABLE_NUMERIC[k]
                t_results[kt] = int(v) if v else None
            if k not in SCHEMA_POLLING_TABLE_NUMERIC.keys():
                t_results[k] = v.decode('utf-8')
        results.append(t_results)
    t.insert_many(results, chunk_size=1000)


def import_results(fname):
    ''' import results by polling table CSV '''
    t = db['resultados']
    f = open(fname, 'r')
    fields = f.readline().strip().split(',')
    c = csv.DictReader(f, fields)
    results = []
    for row in c:
        t_results = {}
        for k, v in row.iteritems():
            if k in SCHEMA_RESULTS_NUMERIC.keys():
                kt = SCHEMA_RESULTS_NUMERIC[k]
                t_results[kt] = int(v) if v else None
            if k not in SCHEMA_RESULTS_NUMERIC.keys():
                t_results[k] = v.decode('utf-8')
        results.append(t_results)
    t.insert_many(results, chunk_size=10000)


def aggregate_results_by_poll_station(table_polling='locales',
                                      table_votes='resultados'):
    ''' aggregate results by polling station
        political party'''
    tmp = []
    for r in db[table_polling]:
        q = '''
        SELECT id_partido, SUM(votos) as votos
            FROM "%s"
            WHERE id_mesa BETWEEN %d AND %d
            GROUP BY id_partido
        ''' % (table_votes,
               int(r['mesa_desde']),
               int(r['mesa_hasta']))

        for p in db.query(q):
            p['id_establecimiento'] = r['id']
            p['mesa_desde'] = r['mesa_desde']
            p['mesa_hasta'] = r['mesa_hasta']
            p['id_distrito'] = r['id_distrito']
            p['id_seccion'] = r['id_seccion']
            p['votos'] = int(p['votos'])
            tmp.append(p)

    votos_est = db['votos_establecimiento']
    votos_est.insert_many(tmp)


def aggregate_census_by_poll_station(table_polling='locales',
                                     table_census='mesas'):
    ''' aggregate census data by polling station '''
    tmp = []
    for r in db[table_polling]:
        q = '''
        SELECT id_establecimiento_gob, SUM(electores) as total
            FROM "%s"
            WHERE id_mesa BETWEEN %d AND %d
            GROUP BY id_establecimiento_gob
        ''' % (table_census,
               int(r['mesa_desde']),
               int(r['mesa_hasta']))

        for p in db.query(q):
            p['id_establecimiento'] = r['id']
            p['id_caba'] = r['id_caba']
            p['mesa_desde'] = r['mesa_desde']
            p['mesa_hasta'] = r['mesa_hasta']
            p['id_distrito'] = r['id_distrito']
            p['id_seccion'] = r['id_seccion']
            p['total'] = int(p['total'])
            tmp.append(p)

    votos_est = db['censo_establecimiento']
    votos_est.insert_many(tmp)


def aggregate_totals_by_poll_station(table_votes='votos_establecimiento'):
    ''' aggregate participation results by polling station '''
    tmp = []
    q = '''
        SELECT id_establecimiento,
            SUM(CASE WHEN id_partido = 'BLC'
                THEN votos else 0 end) as blancos,
            SUM(CASE WHEN id_partido not in ('NUL', 'REC', 'IMP')
                THEN votos else 0 end) as validos,
            SUM(CASE WHEN id_partido not in ('BLC', 'NUL', 'REC', 'IMP')
                THEN votos else 0 end) as positivos,
            SUM(CASE WHEN id_partido in ('NUL', 'REC', 'IMP')
                THEN votos else 0 end) as invalidos
            FROM "%s"
            GROUP BY id_establecimiento
        ''' % (table_votes)

    for p in db.query(q):
        p['id_establecimiento'] = int(p['id_establecimiento'])
        p['blancos'] = int(p['blancos'])
        p['validos'] = int(p['validos'])
        p['positivos'] = int(p['positivos'])
        p['invalidos'] = int(p['invalidos'])
        tmp.append(p)
    votos_est = db['totales_establecimiento']
    votos_est.insert_many(tmp)


def make_cache_table(table_polling='locales',
                     table_votes='votos_establecimiento',
                     table_census='censo_establecimiento',
                     table_totals='totales_establecimiento'):
    q = '''
        WITH %(winner)s AS (SELECT id_establecimiento, id_partido, votos,
        row_number() over(partition by id_establecimiento
                          ORDER BY votos DESC) as rank,
        SQRT(votos - lead(votos,1,0) over(partition by id_establecimiento
                                          ORDER BY votos DESC)) as margin_victory
        FROM %(table_votes)s
        ORDER BY id_establecimiento, rank)
        SELECT c.id_establecimiento_gob as id_establecimiento_gob,
               l.id as id_establecimiento,
               l.id_distrito, l.id_seccion,
               l.mesa_desde, l.mesa_hasta, l.num_mesas, l.geom,
               l.circuito, l.direccion, l.nombre,
               c.total as electores,
               t.positivos, sqrt(t.positivos) as sqrt_positivos,
               (t.validos + t.invalidos) as votantes,
               w.id_partido, w.votos, w.margin_victory
        FROM %(table_polling)s l
        INNER JOIN %(winner)s w ON l.id = w.id_establecimiento
        INNER JOIN %(table_census)s c ON l.id = c.id_establecimiento
        INNER JOIN %(table_totals)s t ON l.id = t.id_establecimiento
        AND w.rank = 1;
        ''' % {'table_polling': table_polling,
               'table_votes': table_votes,
               'table_census': table_census,
               'table_totals': table_totals,
               'winner': 'winner'}

    results = db.query(q)
    cache_table = db['cache_votos_paso_2015']
    cache_table.insert_many(results)


def process_CABA():
    print "clear DB"
    clearDB()
    print "import polling station data"
    import_poll_stations('%s/%s'
                         % (REL_POLLING_PATH, POLLING_STATIONS_DATA_FILE))

    print "import polling tables data"
    import_poll_tables('%s/%s'
                       % (REL_POLLING_PATH, POLLING_TABLES_DATA_FILE))

    print "import results"
    import_results('%s/%s'
                   % (REL_RESULTS_PATH, RESULTS_DATA_FILE))

    print "aggregate census data by polling station"
    aggregate_census_by_poll_station('locales', 'mesas')

    print "aggregate results by polling station and party"
    aggregate_results_by_poll_station('locales', 'resultados')

    print "aggregate totals by polling station"
    aggregate_totals_by_poll_station('votos_establecimiento')

    print "create unnormalized table for cartodb performance"
    make_cache_table('locales',
                     'votos_establecimiento',
                     'censo_establecimiento',
                     'totales_establecimiento')


if __name__ == "__main__":
    db = connect_dataset()
    process_CABA()
