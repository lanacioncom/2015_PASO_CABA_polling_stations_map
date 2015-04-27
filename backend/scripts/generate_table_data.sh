for i in $( mdb-tables ../mdb/ARGENTINA2013.mdb ); 
    do echo $i ; 
    mdb-export -D "%Y-%m-%d %H:%M:%S" -q "'" -H -I postgres ../mdb/ARGENTINA2013.mdb $i > ../output/data/$i.sql; 
done