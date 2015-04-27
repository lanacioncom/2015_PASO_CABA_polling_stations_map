# coding: utf-8
import dataset
from subprocess import Popen, PIPE
import csv
import sys, os

db = None
dir = os.path.dirname(__file__)
REL_MDB_PATH = os.path.join(dir, '../mdb')
REL_POLLING_PATH = os.path.join(dir, '../../establecimientos')

def connect_dataset():
    #return dataset.connect('sqlite:///legislativas2013.db')
    return dataset.connect('postgresql://jjelosua@localhost:5432/legislativas2013')

def clearDB():
    """ Clears the DB to make the script idempotent """
    for t in db.tables:
        db.get_table(t).drop()


def import_locales(fname):
    """ importar CSV de locales """
    t = db['locales']
    f = open(fname)
    fields = f.readline().strip().split(',')
    c = csv.DictReader(f, fields)
    for row in c:
        t.insert({k: v.decode('utf-8') for (k, v) in row.items()})


def import_access(dbfile, table, district=None, section=None):
    """ importa una tabla del .MDB de DNE a una tabla en SQLite """
    dataset = db[table]
    cmd = "mdb-export %s %s" % (dbfile, table,)

    if district is not None:
        cmd += " | csvgrep -c 1 -m %02d" % district

        if section is not None:
            if type(section) != tuple:
                section = (section,)
            cmd += " | csvgrep -c 2 -r \"%s\"" % '|'.join(['%03d' % i for i in section])

    print >>sys.stderr, "running cmd: %s" % (cmd)

    p1 = Popen(cmd,
               shell=True,
               stdout=PIPE)
    fields = [s.strip() for s in p1.stdout.readline().split(',')]
    # Create an iterator to read all the output lines
    reader = csv.DictReader(iter(p1.stdout.readline, ''), fields)
    for d in reader:
        dataset.insert({k: v.strip().decode('utf-8') for (k,v) in d.items()})

def aggregate_votes_by_polling_station(table_polling='locales', table_votes='VotosCandidaturaMesasDNacionales', district=None):
    """ votos totales por partido, por establecimiento """
    district_str = str(district)
    tmp = []
    for r in db[table_polling].find(distrito_id=district_str):
        q = """
        SELECT "vot_parCodigo" as vot_parcodigo, SUM(CAST("votVotosPartido" AS INTEGER)) as total
         FROM "%s"
        WHERE CAST("vot_mesCodigoMesa" AS INTEGER) BETWEEN %d AND %d
          AND CAST("vot_proCodigoProvincia" AS INTEGER) = %d
          AND CAST("vot_depCodigoDepartamento" AS INTEGER) = %d
        GROUP BY "vot_parCodigo"
        """ % (table_votes,
               int(r['mesa_desde']),
               int(r['mesa_hasta']),
               int(district if district is not None else r['distrito_id']),
               int(r['seccion_id']))

        for p in db.query(q):
            p['establecimiento_id'] = r['id']
            p['mesa_desde'] = int(r['mesa_desde'])
            p['mesa_hasta'] = int(r['mesa_hasta'])
            p['distrito_id'] = int(district if district is not None else r['distrito_id'])
            p['seccion_id'] = int(r['seccion_id'])
            p['total'] = int(p['total'])
            p['votacion']   = table_votes
            tmp.append(p)

    votos_est = db['votos_establecimiento']
    for p in tmp:
        print(p)
        votos_est.insert(p)

def aggregate_results_by_polling_station(table_polling='locales', table_voting_tables='MesasDNacionales',
                                         table_votes='VotosCandidaturaMesasDNacionales', district=None):
    """ resultados de participación totales, por establecimiento """
    tmp = []
    district_str = str(district)
    for r in db[table_polling].find(distrito_id=district_str):
        q = """
        SELECT SUM(CAST("mesVotosPositivos" AS INTEGER)) as positivos,
               SUM(CAST("mesElectores" AS INTEGER)) as electores,
               SUM(CAST("mesTotalVotantes" AS INTEGER)) as votantes
         FROM "%s"
        WHERE CAST("mesCodigoMesa" AS INTEGER) BETWEEN %d AND %d
          AND CAST("mes_proCodigoProvincia" AS INTEGER) = %d
          AND CAST("mes_depCodigoDepartamento" AS INTEGER) = %d
        """ % (table_voting_tables,
               int(r['mesa_desde']),
               int(r['mesa_hasta']),
               int(district if district is not None else r['distrito_id']),
               int(r['seccion_id']))

        for p in db.query(q):
            p['establecimiento_id'] = r['id']
            p['mesa_desde'] = int(r['mesa_desde'])
            p['mesa_hasta'] = int(r['mesa_hasta'])
            p['distrito_id'] = int(district if district is not None else r['distrito_id'])
            p['seccion_id'] = int(r['seccion_id'])
            p['positivos'] = int(p['positivos'])
            p['electores'] = int(p['electores'])
            p['votantes'] = int(p['votantes'])
            p['votacion']   = table_votes
            tmp.append(p)

    votos_est = db['mesas_establecimiento']
    for p in tmp:
        print(p)
        votos_est.insert(p)

def make_cache_table(table_polling='locales', table_voting_tables='mesas_establecimiento',
                     table_votes='votos_establecimiento', election='VotosCandidaturaMesasDNacionales'):
    tmp = []
    q = """
        WITH %(winner)s AS (SELECT establecimiento_id, vot_parcodigo, total,
        row_number() over(partition by establecimiento_id ORDER BY total DESC) as rank,
        SQRT(total - lead(total,1,0) over(partition by establecimiento_id ORDER BY total DESC)) as margin_victory
        FROM %(table_votes)s
        ORDER BY establecimiento_id, rank)
        SELECT l.id as establecimiento_id, l.distrito_id, l.seccion_id,
               l.mesa_desde, l.mesa_hasta, l.cant_mesas, l.the_geom,
               l.circuito, l.direccion, l.establecim as nombre,
               m.votantes, m.electores, m.positivos, sqrt(m.positivos) as sqrt_positivos,
               w.vot_parcodigo, w.total, w.margin_victory
        FROM %(table_polling)s l
        INNER JOIN %(table_voting_tables)s m ON l.id = m.establecimiento_id
        INNER JOIN %(winner)s w ON l.id = w.establecimiento_id
        AND w.rank = 1;
        """ % {'table_polling': table_polling,
               'table_voting_tables': table_voting_tables,
               'table_votes': table_votes,
               'winner': 'winner'}
    print q

    for p in db.query(q):
        p['establecimiento_id'] = int(p['establecimiento_id'])
        p['mesa_desde'] = int(p['mesa_desde'])
        p['mesa_hasta'] = int(p['mesa_hasta'])
        p['cant_mesas'] = int(p['cant_mesas'])
        p['distrito_id'] = int(p['distrito_id'])
        p['seccion_id'] = int(p['seccion_id'])
        tmp.append(p)
    
    cache_table = db['cache_votos_caba_2013']
    for p in tmp:
        print(p)
        cache_table.insert(p)

def import_locales_csvkit(fname, db=None, table=None, district=None, section=None):
    """ importa una tabla de CSV a postgres insertando datos """
    cmd = "csvcut -l %s" % (fname)
    if district is not None:
        cmd += " | csvgrep -c 8 -m %d" % (district)

        if section is not None:
            if type(section) != tuple:
                section = (section,)
            cmd += " | csvgrep -c 7 -r \"%s\"" % '|'.join(['%03d' % i for i in section])
    cmd += " | csvsql --db %s --table %s --insert" % (db, table)
    print >>sys.stderr, "running cmd: %s" % (cmd)

    p1 = Popen(cmd, shell=True, stdout=PIPE)

def process_CABA():
    print "clear DB"
    clearDB()
    print "locales"
    import_locales('%s/locales2013.csv' % (REL_POLLING_PATH))
    
    print "partidos"
    import_access('%s/ARGENTINA2013.mdb' % (REL_MDB_PATH), 'Partidos')

    print "CIUDAD AUTONOMA DE BUENOS AIRES - distrito: %d" % (2)

    print "mesas diputados nacionales"
    import_access('%s/ARGENTINA2013.mdb' % (REL_MDB_PATH), 'MesasDNacionales', 2)
    print "votos candidatura diputados nacionales por mesa"
    import_access('%s/ARGENTINA2013.mdb' % (REL_MDB_PATH), 'VotosCandidaturaMesasDNacionales', 2)
    print "agregando por establecimientos de votacion para diputados"
    aggregate_votes_by_polling_station('locales', 'VotosCandidaturaMesasDNacionales', 2)
    aggregate_results_by_polling_station('locales', 'MesasDNacionales', 'VotosCandidaturaMesasDNacionales', 2)

    make_cache_table('locales','mesas_establecimiento','votos_establecimiento')

if __name__ == "__main__":  
    db = connect_dataset()
    #make_cache_table('locales','mesas_establecimiento','votos_establecimiento')
    #process_CABA()
