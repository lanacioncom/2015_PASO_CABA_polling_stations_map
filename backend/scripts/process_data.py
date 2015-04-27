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
    return dataset.connect('sqlite:///legislativas2013.db')

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
    tmp = []
    for r in db[table_polling].find(distrito_id=district):
        q = """
        SELECT vot_parCodigo, SUM(CAST(votVotosPartido AS INTEGER)) as total
         FROM %s
        WHERE CAST(vot_mesCodigoMesa AS INTEGER) BETWEEN %d AND %d
          AND CAST(vot_proCodigoProvincia AS INTEGER) = %d
          AND CAST(vot_depCodigoDepartamento AS INTEGER) = %d
        GROUP BY vot_parCodigo
        """ % (table_votes,
               int(r['mesa_desde']),
               int(r['mesa_hasta']),
               int(district if district is not None else r['distrito_id']),
               int(r['seccion_id']))
        print q

        for p in db.query(q):
            p['establecimiento_id'] = r['id']
            p['mesa_desde'] = int(r['mesa_desde'])
            p['mesa_hasta'] = int(r['mesa_hasta'])
            p['distrito_id'] = int(district if district is not None else r['distrito_id'])
            p['seccion_id'] = int(r['seccion_id'])
            p['votacion']   = table_votes
            tmp.append(p)

    votos_est = db['votos_establecimiento']
    for p in tmp:
        votos_est.insert(p)

def aggregate_results_by_polling_station(table_polling='locales', table_voting_tables='MesasDNacionales',
                                         table_votes='VotosCandidaturaMesasDNacionales', district=None):
    """ resultados de participación totales, por establecimiento """
    tmp = []
    for r in db[table_polling].find(distrito_id=district):
        q = """
        SELECT SUM(CAST(mesVotosPositivos AS INTEGER)) as positivos,
               SUM(CAST(mesElectores AS INTEGER)) as electores,
               SUM(CAST(mesTotalVotantes AS INTEGER)) as votantes
         FROM %s
        WHERE CAST(mesCodigoMesa AS INTEGER) BETWEEN %d AND %d
          AND CAST(mes_proCodigoProvincia AS INTEGER) = %d
          AND CAST(mes_depCodigoDepartamento AS INTEGER) = %d
        """ % (table_voting_tables,
               int(r['mesa_desde']),
               int(r['mesa_hasta']),
               int(district if district is not None else r['distrito_id']),
               int(r['seccion_id']))
        print q

        for p in db.query(q):
            p['establecimiento_id'] = r['id']
            p['mesa_desde'] = int(r['mesa_desde'])
            p['mesa_hasta'] = int(r['mesa_hasta'])
            p['distrito_id'] = int(district if district is not None else r['distrito_id'])
            p['seccion_id'] = int(r['seccion_id'])
            p['votacion']   = table_votes
            tmp.append(p)

    votos_est = db['mesas_establecimiento']
    for p in tmp:
        votos_est.insert(p)

def make_cache_table(table_polling='locales', table_voting_tables='mesas_establecimiento',
                     table_votes='votos_establecimiento', election='VotosCandidaturaMesasDNacionales'):
    q = """
        SELECT l.*,
               SUM(CAST(mesElectores AS INTEGER)) as electores,
               SUM(CAST(mesTotalVotantes AS INTEGER)) as votantes
         FROM %s l
         LEFT OUTER JOIN %s m
         ON l.id = m.id
         
        WHERE CAST(mesCodigoMesa AS INTEGER) BETWEEN %d AND %d
          AND CAST(mes_proCodigoProvincia AS INTEGER) = %d
          AND CAST(mes_depCodigoDepartamento AS INTEGER) = %d
        """ % (table_voting_tables,
               int(r['mesa_desde']),
               int(r['mesa_hasta']),
               int(district if district is not None else r['distrito_id']),
               int(r['seccion_id']))
    print q

def import_locales(fname):
    """ importar CSV de locales - el CSV viene de CartoDB """
    t = db['locales']
    f = open(fname)
    fields = f.readline().strip().split(',')
    c = csv.DictReader(f, fields)
    for row in c:
        t.insert({k: v.decode('utf-8') for (k,v) in row.items()})

def process_CABA():
    print "locales"
    import_locales('%s/caba_est_2015.csv' % (REL_POLLING_PATH))

    print "partidos"
    import_access('%s/ARGENTINA2013.mdb' % (REL_MDB_PATH), 'Partidos')

    print "CIUDAD AUTONOMA DE BUENOS AIRES - distrito: %d" % (1)

    print "mesas diputados nacionales"
    import_access('%s/ARGENTINA2013.mdb' % (REL_MDB_PATH), 'MesasDNacionales', 1)
    print "votos candidatura diputados nacionales por mesa"
    import_access('%s/ARGENTINA2013.mdb' % (REL_MDB_PATH), 'VotosCandidaturaMesasDNacionales', 1)
    print "agregando por establecimientos de votacion para diputados"
    aggregate_votes_by_polling_station('locales', 'VotosCandidaturaMesasDNacionales', 1)
    aggregate_results_by_polling_station('locales', 'MesasDNacionales', 'VotosCandidaturaMesasDNacionales', 1)

if __name__ == "__main__":  
    db = connect_dataset()
    process_CABA()
