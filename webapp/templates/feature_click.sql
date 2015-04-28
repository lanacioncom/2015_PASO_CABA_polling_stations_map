SELECT p.descripcion, v.id_partido, v.votos
FROM votos_paso_caba_2015 v
LEFT OUTER JOIN partidos_paso_caba_2015 p ON p.id_partido = v.id_partido
WHERE v.id_establecimiento = <%- establecimiento.id_establecimiento %>
AND v.id_seccion = <%- establecimiento.id_seccion %>
AND v.id_distrito = <%- establecimiento.id_distrito %>
ORDER BY v.votos DESC