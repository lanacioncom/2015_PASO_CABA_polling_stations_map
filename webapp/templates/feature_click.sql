SELECT p.descripcion, v.id_partido, v.votos
FROM votos_partido_establecimiento_paso_2015 v
LEFT OUTER JOIN partidos_paso_caba_2015 p ON p.id_partido = v.id_partido
WHERE v.id_establecimiento = <%- establecimiento.id_establecimiento %>
AND p.especial = 0
ORDER BY v.votos DESC