/*!
* Handlebars helpers
*/

Handlebars.registerHelper('ifCond', function(v1, v2, options) {
  if(v1 == v2) {
	return options.fn(this);
  }
  return options.inverse(this);
});


Handlebars.registerHelper('ifNotCond', function(v1, v2, options) {
  if(v1 != v2) {
	return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('chekIsLessThan15', function(options) {
	if(options.data.root.is_comuna) {
		return "";
	}else if(/[a-z]/gi.test(this.id)){
		return "";
	}else if(this.p < 1.5){
		return "no_pasa";
	}
});


Handlebars.registerHelper( "lower", function ( _str ){
	return  _str.toLowerCase();
});

Handlebars.registerHelper( "toFixed_n", function ( n ){
	// return (+n).toFixed(1);
	return (+n).format(1, ",", '.');
});

Handlebars.registerHelper( "toFixed_n_0", function ( n ){
	// return (+n).toFixed(1);
	return (+n).format(0, ",", '.');
});

Handlebars.registerHelper( "get_partido", function ( options ){
	var dict_p = options.data.root.dict_partidos;
	return dict_p[this.id_partido] ? dict_p[this.id_partido].nombre_partido : "";
});

Handlebars.registerHelper( "get_candidato_nombre", function ( options ){
	var dict_p = options.data.root.dict_candidatos;
	return dict_p[this.id] ? dict_p[this.id].nombre_completo : "";
});

Handlebars.registerHelper( "get_candidato_color", function ( options ){
	var dict_p = options.data.root.dict_candidatos;
	return dict_p[this.id] ? dict_p[this.id].color_candidato : "";
});

Handlebars.registerHelper( "get_candidato_apellido_class", function ( options ){
	var dict_p = options.data.root.dict_candidatos;
	return dict_p[this.id] ? dict_p[this.id].foto.toLowerCase() : "";
});

Handlebars.registerHelper( "get_partido_color", function ( options ){
	var dict_p = options.data.root.dict_partidos;
	return dict_p[this.id_partido] ? dict_p[this.id_partido].color_partido : "";
});

Handlebars.registerHelper( "division", function (e, options ){
	return ((+e.votantes / +e.electores)*100).format(1, ",", '.');
});


Handlebars.registerHelper( "get_partido_css_class", function ( dict, id, options ){
	return dict[this.id] ? dict[this.id].nombre_partido.replace(/\./gi, "").replace(/\s/gi, "_").toLowerCase() : "";
});


Handlebars.registerHelper( "get_width_bar", function ( porcentaje, max, options ){
	var n = porcentaje*100/max;
	return  n;
});

Handlebars.registerHelper( "check_index_opacyti", function ( options ){
	var r = "";
	var win1 = options.data.root.interna.c_00[0].id;
	var win2 = options.data.root.interna.c_00[1].id;

	if(this.id != win1){
		r = "opacity: .4;";		
		if(this.id != win2){
			r += "background: #ccc;";		
		}
	}
	return r;
});



Handlebars.registerHelper("debug", function(optionalValue) {
	console.log("Current Context");
	console.log("====================");
	console.log(this);
	if (optionalValue) {
		console.log("Value");
		console.log("====================");
		console.log(optionalValue);
	}
});


Number.prototype.format = function(c, d, t){
        var n = this;
        c = isNaN(c = Math.abs(c)) ? 2 : c;
        d = d === undefined ? "." : d;
        t = t === undefined ? "," : t;
        var s = n < 0 ? "-" : "",
        i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
        j = (j = i.length) > 3 ? j % 3 : 0;
        var nn = s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
        return nn;
    };

 var get_max_obj = function(arr, key){ 
	
	var max = arr.map(function(x){ return x[key]; });
	return Math.max.apply(null, max); 
};

var animate_barras = function(){
	$("#results .cont_barra .barra").each(function(i, el){
		var $el = $(this);
		$el.delay(500).animate({width: $el.data("width")}, {duration: 900, queue:false});
	});
};