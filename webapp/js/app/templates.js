define(['text!templates/credits.html',
    'text!templates/overlay.html',
    'text!templates/popup.html',
    'text!templates/sections.html',
    'text!templates/sections_polling_tables.html',
    'text!templates/cartocss.css',
    'text!templates/feature_click.sql'], 
    function(credits, overlay, popup, sections, polling, cartocss, feature_click_sql) {
        return {
            credits: credits,
            overlay: overlay,
            popup: popup,
            sections: sections,
            polling: polling,
            cartocss: cartocss,
            feature_click_sql: feature_click_sql
        }
});