#!/usr/bin/env python
# coding: utf-8
from collections import OrderedDict
import dataset
import csvkit
#import simplejson
import io, json

OUTPUT_DIR = 'comunas'

def simplify_bounds(b):
    env = json.loads(b)
    return env['coordinates'][0]

def run():
    q = '''
        SELECT 'Comuna ' || comunas as nombre, 
        comunas as departamento, 1 as provincia, 
        st_asgeojson(st_envelope(geom)) AS bounds
        FROM comunas;
    '''
    distritos = []
    capital = {'distrito_id': 1, 'provincia': 'Capital Federal'}

    results = []
    qr = db.query(q)
    for d in qr:
        row = {}
        row['nombre'] = d['nombre']
        row['departamento'] = d['departamento']
        row['provincia'] = d['provincia']
        row['bounds'] = simplify_bounds(d['bounds'])
        results.append(row)
    
    capital['secciones'] = results
    distritos.append(capital)
    with io.open('%s/comunas.json' % OUTPUT_DIR, 'w', encoding='utf-8') as f:
        f.write(unicode(json.dumps(distritos, ensure_ascii=False)))


    # r = [dict(e.items() + [('bounds',simplejson.loads(e['bounds']))])
    #      for e in qr]
    # with io.open('%s/comunas.json' % OUTPUT_DIR, 'w', encoding='utf-8') as f:
    #     f.write(unicode(json.dumps(r, ensure_ascii=False)))
    # #dataset.freeze(results, format='json', filename='comunas.json')

if __name__ == '__main__':
    # connecting to a PostgreSQL database
    db = dataset.connect('postgresql://jjelosua@localhost:5432/CABA_2015')
    run()

