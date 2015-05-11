define(['text!templates/credits.html',
    'text!templates/overlay.html',
    'text!templates/popup.html',
    'text!templates/cartocss.txt',
    'text!templates/feature_click.sql',
    'text!templates/permalink.sql'], 
    function(credits, overlay, popup, cartocss, feature_click_sql, permalink_sql) {
        return {
            credits: credits,
            overlay: overlay,
            popup: popup,
            cartocss: cartocss,
            feature_click_sql: feature_click_sql,
            permalink_sql: permalink_sql
        }
});