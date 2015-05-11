SELECT *, st_asgeojson(the_geom) as g 
FROM cache_votos_paso_2015 
WHERE id_establecimiento = {{id_establecimiento}};